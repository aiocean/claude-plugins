package main

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// Column indexes the five lanes in the fixed order the SKILL.md board protocol
// mandates. The order is load-bearing: it is the on-disk section order, the
// render order, and the direction </>  shift a card.
type Column int

const (
	Backlog Column = iota
	Todo
	Doing
	Done
	Blocked
	numColumns
)

var columnNames = [numColumns]string{"Backlog", "Todo", "Doing", "Done", "Blocked"}

func (c Column) String() string {
	if c < 0 || c >= numColumns {
		return "?"
	}
	return columnNames[c]
}

// columnByName resolves a "## Heading" to its Column, or -1 when the heading is
// not one of the five protocol lanes (such a section is dropped from the board model).
func columnByName(name string) Column {
	for i, n := range columnNames {
		if strings.EqualFold(n, name) {
			return Column(i)
		}
	}
	return -1
}

// Task is one board line. Raw is the verbatim line text — moving a card relocates
// Raw between lanes losslessly, so a board write never reformats a line the agent
// wrote. The parsed fields exist only for rendering.
type Task struct {
	ID       string // T-NNN
	Title    string
	Priority string
	Effort   string
	Rel      string // link target as written, e.g. "tasks/T-001-slug.md"
	Raw      string // verbatim board line (no trailing newline)
}

// Board is the parsed .kanban/board.md. Preamble is everything before the first
// "## " heading (the title + the Updated comment); it is preserved verbatim on
// write except for the timestamp refresh. ModTime is the board.md mtime at load,
// the staleness guard for save().
type Board struct {
	Dir      string
	Preamble string
	Cols     [numColumns][]Task
	ModTime  time.Time
}

// errStale reports that board.md changed on disk since this Board was loaded —
// saving would clobber an external edit (an agent writing the board beside us).
var errStale = errors.New("board.md changed on disk since it was loaded")

// now is indirected so tests can pin the date that today() stamps.
var now = time.Now

func today() string { return now().Format("2006-01-02") }

var boardLineRe = regexp.MustCompile(`^- \[(T-\d+)\]\(([^)]+)\)\s*(.*)$`)

// parseBoardLine extracts a Task from one board line. ok is false for any line
// that is not a task line (blank lines, stray prose) so the caller can skip it.
func parseBoardLine(raw string) (Task, bool) {
	raw = strings.TrimRight(raw, "\r\n")
	m := boardLineRe.FindStringSubmatch(raw)
	if m == nil {
		return Task{}, false
	}
	t := Task{ID: m[1], Rel: m[2], Raw: raw}
	rest := strings.TrimSpace(m[3])
	// rest is "Title — priority/effort"; the em dash separates title from meta.
	// Anything that does not match degrades gracefully to a bare title.
	if i := strings.LastIndex(rest, "—"); i >= 0 {
		t.Title = strings.TrimSpace(rest[:i])
		meta := strings.TrimSpace(rest[i+len("—"):])
		if j := strings.Index(meta, "/"); j >= 0 {
			t.Priority = strings.TrimSpace(meta[:j])
			t.Effort = strings.TrimSpace(meta[j+1:])
		} else {
			t.Priority = meta
		}
	} else {
		t.Title = rest
	}
	return t, true
}

// loadBoard reads and parses .kanban/board.md at dir.
func loadBoard(dir string) (*Board, error) {
	path := filepath.Join(dir, "board.md")
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	b := &Board{Dir: dir, ModTime: info.ModTime()}
	var pre []string
	cur := Column(-1)
	seenHeading := false
	for _, ln := range strings.Split(string(data), "\n") {
		trimmed := strings.TrimSpace(ln)
		if strings.HasPrefix(trimmed, "## ") {
			seenHeading = true
			cur = columnByName(strings.TrimSpace(trimmed[3:]))
			continue
		}
		if !seenHeading {
			pre = append(pre, ln)
			continue
		}
		if cur < 0 {
			continue
		}
		if t, ok := parseBoardLine(ln); ok {
			b.Cols[cur] = append(b.Cols[cur], t)
		}
	}
	b.Preamble = strings.TrimRight(strings.Join(pre, "\n"), "\n")
	if b.Preamble == "" {
		b.Preamble = "# Kanban Board\n<!-- Updated: " + today() + " -->"
	}
	return b, nil
}

var updatedRe = regexp.MustCompile(`(?m)^<!-- Updated:.*-->$`)

// render serializes the board back to board.md text. Lanes are emitted in the
// fixed protocol order with their verbatim card lines; the Updated timestamp in
// the preamble is refreshed to today.
func (b *Board) render() string {
	preamble := b.Preamble
	stamp := "<!-- Updated: " + today() + " -->"
	if updatedRe.MatchString(preamble) {
		preamble = updatedRe.ReplaceAllString(preamble, stamp)
	}

	var sb strings.Builder
	sb.WriteString(strings.TrimRight(preamble, "\n"))
	sb.WriteString("\n\n")
	for c := Column(0); c < numColumns; c++ {
		sb.WriteString("## ")
		sb.WriteString(c.String())
		sb.WriteString("\n\n")
		for _, t := range b.Cols[c] {
			sb.WriteString(t.Raw)
			sb.WriteString("\n")
		}
		if len(b.Cols[c]) > 0 {
			sb.WriteString("\n")
		}
	}
	return strings.TrimRight(sb.String(), "\n") + "\n"
}

// save writes board.md atomically (temp file + rename) and refuses to overwrite
// a board that changed on disk since load (errStale). On success ModTime is
// advanced to the freshly written file so the next save's guard is accurate.
func (b *Board) save() error {
	path := filepath.Join(b.Dir, "board.md")
	if info, err := os.Stat(path); err == nil && info.ModTime().After(b.ModTime) {
		return errStale
	}
	if err := atomicWriteFile(path, b.render()); err != nil {
		return err
	}
	if info, err := os.Stat(path); err == nil {
		b.ModTime = info.ModTime()
	}
	return nil
}

// move relocates the card at index idx in lane c to the end of lane dest. A
// no-op when idx is out of range or dest == c.
func (b *Board) move(c Column, idx int, dest Column) {
	if idx < 0 || idx >= len(b.Cols[c]) || dest == c || dest < 0 || dest >= numColumns {
		return
	}
	t := b.Cols[c][idx]
	b.Cols[c] = append(b.Cols[c][:idx], b.Cols[c][idx+1:]...)
	b.Cols[dest] = append(b.Cols[dest], t)
}

// nextID returns the next monotonic task ID (highest existing + 1, never reused).
func (b *Board) nextID() string {
	max := 0
	for c := range b.Cols {
		for _, t := range b.Cols[c] {
			var n int
			if _, err := fmt.Sscanf(t.ID, "T-%d", &n); err == nil && n > max {
				max = n
			}
		}
	}
	return fmt.Sprintf("T-%03d", max+1)
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

// slugify produces the kebab-case slug for a task title (lowercase, alphanumeric
// and hyphen only, ≤40 chars) per the protocol's slug rule.
func slugify(title string) string {
	s := slugRe.ReplaceAllString(strings.ToLower(title), "-")
	s = strings.Trim(s, "-")
	if len(s) > 40 {
		s = strings.Trim(s[:40], "-")
	}
	if s == "" {
		s = "task"
	}
	return s
}

// addTask creates a new task file from the protocol template and appends its
// board line to Backlog. The board itself is not written — the caller saves.
func (b *Board) addTask(title string) (Task, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return Task{}, errors.New("empty title")
	}
	id := b.nextID()
	rel := "tasks/" + id + "-" + slugify(title) + ".md"
	body := fmt.Sprintf("# %s: %s\n> %s\n\n- **priority**: medium\n- **effort**: M\n\n## Criteria\n- [ ] \n\n## Notes\n", id, title, title)
	p := filepath.Join(b.Dir, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		return Task{}, err
	}
	if err := atomicWriteFile(p, body); err != nil {
		return Task{}, err
	}
	t := Task{
		ID:       id,
		Title:    title,
		Priority: "medium",
		Effort:   "M",
		Rel:      rel,
		Raw:      fmt.Sprintf("- [%s](%s) %s — medium/M", id, rel, title),
	}
	b.Cols[Backlog] = append(b.Cols[Backlog], t)
	return t, nil
}

var metaFieldRe = regexp.MustCompile(`^- \*\*[a-zA-Z-]+\*\*:`)

// stampField inserts "- **field**: value" into a task file's metadata block (after
// the last existing "- **key**:" line, else at end of file). A no-op if the field
// already exists, so re-moving into Done/Blocked never duplicates a stamp.
func stampField(dir, rel, field, value string) error {
	p := filepath.Join(dir, filepath.FromSlash(rel))
	data, err := os.ReadFile(p)
	if err != nil {
		return err
	}
	content := string(data)
	if strings.Contains(content, "- **"+field+"**:") {
		return nil
	}
	newLine := "- **" + field + "**: " + value
	lines := strings.Split(content, "\n")
	last := -1
	for i, ln := range lines {
		if metaFieldRe.MatchString(ln) {
			last = i
		}
	}
	if last >= 0 {
		out := append([]string{}, lines[:last+1]...)
		out = append(out, newLine)
		out = append(out, lines[last+1:]...)
		content = strings.Join(out, "\n")
	} else {
		content = strings.TrimRight(content, "\n") + "\n" + newLine + "\n"
	}
	return atomicWriteFile(p, content)
}

// atomicWriteFile writes content to path via a temp file in the same directory
// followed by a rename, so a crash mid-write never leaves a truncated file.
func atomicWriteFile(path, content string) error {
	dir := filepath.Dir(path)
	tmp, err := os.CreateTemp(dir, ".aiokan-*.tmp")
	if err != nil {
		return err
	}
	tmpName := tmp.Name()
	defer os.Remove(tmpName)
	if _, err := tmp.WriteString(content); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpName, path)
}

// findKanban walks up from start looking for a directory containing
// .kanban/board.md, returning the path to that .kanban directory.
func findKanban(start string) (string, error) {
	dir, err := filepath.Abs(start)
	if err != nil {
		return "", err
	}
	for {
		cand := filepath.Join(dir, ".kanban")
		if info, err := os.Stat(filepath.Join(cand, "board.md")); err == nil && !info.IsDir() {
			return cand, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", errors.New("no .kanban/board.md found in this directory or any parent")
		}
		dir = parent
	}
}
