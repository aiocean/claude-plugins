# Static Analysis Tools for Go

Beyond `go vet` and `golangci-lint`, these tools catch entire categories of bugs that linters miss.

## Tool Overview

### Bug Detection

| Tool | Source | What It Catches | Install |
|------|--------|-----------------|---------|
| `govulncheck` | Go team (official) | Known CVEs in deps and stdlib | `go install golang.org/x/vuln/cmd/govulncheck@latest` |
| `nilaway` | Uber | Nil pointer dereferences at compile time | `go install go.uber.org/nilaway/cmd/nilaway@latest` |
| `deadcode` | Go team (official) | Unreachable/unused functions | `go install golang.org/x/tools/cmd/deadcode@latest` |
| `golangci-lint` | Community | 50+ linters (style, bugs, perf, security) | `brew install golangci-lint` or binary |
| `gosec` | Securego | OWASP security issues | Included in golangci-lint, or standalone |
| `staticcheck` | Dominik Honnef | 150+ advanced checks | Included in golangci-lint, or standalone |

### Complexity & Maintainability

| Tool | Source | What It Measures | Install |
|------|--------|-----------------|---------|
| `gocyclo` | Community | Cyclomatic complexity per function | `go install github.com/fzipp/gocyclo/cmd/gocyclo@latest` |
| `gocognit` | Community | Cognitive complexity per function | `go install github.com/uudashr/gocognit/cmd/gocognit@latest` |
| `complexity` | Community | Cyclomatic + Halstead + Maintainability Index | `go install github.com/shoooooman/go-complexity-analysis/cmd/complexity@latest` |

## govulncheck — Vulnerability Scanner

Scans Go dependencies and stdlib against the Go vulnerability database. Reports only vulnerabilities that your code actually calls (not just imports).

```bash
# Scan entire project
govulncheck ./...

# Verbose: show all vulns including unused
govulncheck -show verbose ./...

# Scan a specific binary
govulncheck -mode=binary ./myapp

# JSON output for CI
govulncheck -format=json ./...
```

### Reading Output

```
Vulnerability #1: GO-2026-4341
    Memory exhaustion in query parameter parsing in net/url
  Found in: net/url@go1.25.1
  Fixed in: net/url@go1.25.6
  Example traces found:
    #1: server.go:234:23: oauth.Server.handleAuthorize calls url.URL.Query
```

**Fix strategies:**
1. **Stdlib vulns** → Upgrade Go version: `go install golang.org/dl/go1.25.7@latest`
2. **Dependency vulns** → `go get -u vulnerable/package@latest && go mod tidy`
3. **Not called** → Lower priority, but still update when convenient

### CI Integration

```yaml
# GitHub Actions
- name: govulncheck
  run: |
    go install golang.org/x/vuln/cmd/govulncheck@latest
    govulncheck ./...
```

## nilaway — Nil Pointer Analysis

Uber's static analyzer that detects nil pointer dereferences at compile time. Uses inter-procedural analysis to trace nil flows across function boundaries.

```bash
# Scan entire project
nilaway ./...

# Scan specific package
nilaway ./internal/auth/...
```

### Common Findings and Fixes

**1. http.Client.Do response not nil-checked:**

```go
// nilaway flags this — resp could theoretically be nil
resp, err := client.Do(req)
if err != nil {
    return err
}
resp.Body.Close() // potential nil panic

// Fix: add nil guard (defensive, Go stdlib guarantees non-nil on nil error)
resp, err := client.Do(req)
if err != nil {
    return err
}
if resp == nil || resp.Body == nil {
    return fmt.Errorf("nil response")
}
defer resp.Body.Close()
```

**2. Map/slice access without nil check:**

```go
// nilaway flags: m could be nil
func process(m map[string]string) {
    v := m["key"] // panic if m is nil
}

// Fix: guard at entry
func process(m map[string]string) {
    if m == nil {
        return
    }
    v := m["key"]
}
```

**3. Interface type assertion without ok check:**

```go
// nilaway flags: unsafe assertion
val := info.Extra["shop"].(string) // panics if not string

// Fix: safe two-value form
val, ok := info.Extra["shop"].(string)
if !ok {
    return ""
}
```

### Suppression

```go
//nolint:nilaway // reason: Go stdlib guarantees non-nil resp when err==nil
resp, err := client.Do(req)
```

## deadcode — Unreachable Function Detection

Official Go team tool. Finds functions that are never called from any `main` or `init` function. More precise than `unused` linter because it analyzes the full call graph.

```bash
# Find dead code
deadcode ./...

# Output format: file.go:line:col: unreachable func: FuncName
```

### When to Act

- **Exported functions** that are truly dead → delete (check if used by external packages first)
- **Unexported functions** that are dead → delete immediately
- **Test helpers** may appear as dead code → ignore if only used in `_test.go`

### False Positives

deadcode doesn't see:
- Reflection-based calls (`reflect.ValueOf(fn).Call(...)`)
- Plugin/RPC registration patterns where functions are passed as values
- Functions only called from `_test.go` files

## Complexity & Maintainability Tools

### gocyclo — Cyclomatic Complexity

Counts linearly independent paths through a function: +1 base, +1 for each `if`, `for`, `case`, `&&`, `||`.

```bash
# Show all functions with complexity > 10
gocyclo -over 10 .

# Top 5 most complex
gocyclo -top 5 .

# Average complexity
gocyclo -avg .
```

**Thresholds:**
| Cyclomatic | Assessment | Action |
|-----------|------------|--------|
| 1-5 | Simple, low risk | No action |
| 6-10 | Moderate | Consider simplifying |
| 11-15 | Complex | Should refactor |
| 16+ | Very complex | Must refactor |

### gocognit — Cognitive Complexity

Measures how hard a function is for a human to understand. Unlike cyclomatic, it penalizes nesting and rewards linear flow. Generally produces higher scores than gocyclo.

```bash
# Show functions with cognitive complexity > 10
gocognit -over 10 .

# Top 5 hardest to understand
gocognit -top 5 .

# Average
gocognit -avg .
```

**Cognitive complexity rules (Go-specific):**
- +1 for `if`, `else if`, `else`, `switch`, `select`, `for`, `goto`
- +1 for `&&`, `||` (each sequence of same operator counts as 1)
- +1 nesting increment for each level of nesting
- Recursion adds +1

### complexity — Maintainability Index

Calculates Halstead complexity and Maintainability Index (MI) per function. MI combines volume, cyclomatic complexity, and lines of code into a single 0-100 score.

```bash
# Functions with cyclomatic > 10 OR maintainability < 20
go vet -vettool=$(which complexity) --cycloover 10 --maintunder 20 ./...

# Only maintainability
go vet -vettool=$(which complexity) --maintunder 30 ./...
```

**Maintainability Index formula:**
```
MI = MAX(0, (171 - 5.2*ln(HalsteadVolume) - 0.23*CyclomaticComplexity - 16.2*ln(LOC)) * 100/171)
```

| MI Score | Assessment |
|----------|------------|
| 65-100 | Good maintainability |
| 20-64 | Moderate, consider refactoring |
| 0-19 | Poor, should refactor |

### Interpreting Results

High complexity is often caused by:
1. **Long handler functions** with auth + validation + API call + error handling → Extract auth/validation into middleware or helpers
2. **Deep nesting** (if inside if inside for) → Return early, extract inner blocks
3. **Many `case` branches** in a switch → Use map dispatch or strategy pattern

**Note:** Some complexity is inherent. HTTP handlers that validate inputs, check auth, call APIs, and handle errors will naturally score 8-12. Focus on functions scoring 15+ first.

## Full Review Workflow

```bash
# 1. Build check
go build ./...

# 2. Standard static analysis
go vet ./...

# 3. Comprehensive linting
golangci-lint run ./...

# 4. Vulnerability scan
govulncheck ./...

# 5. Nil safety
nilaway ./...

# 6. Dead code
deadcode ./...

# 7. Complexity (flag functions > 10 cyclomatic)
gocyclo -over 10 .
gocognit -over 15 .

# 8. Maintainability index (flag < 20)
go vet -vettool=$(which complexity) --cycloover 10 --maintunder 20 ./...

# 9. Race detection (requires tests)
go test -race ./...
```

### PR Review (changed code only)

```bash
# Lint only changed lines
golangci-lint run --new ./...

# Or from merge-base
golangci-lint run --new-from-merge-base=main ./...

# Vuln check is always full-project (dependency-level)
govulncheck ./...

# nilaway and deadcode are always full-project
nilaway ./...
deadcode ./...
```

## Tool Comparison

| Concern | go vet | golangci-lint | govulncheck | nilaway | deadcode | gocyclo | gocognit | complexity |
|---------|--------|---------------|-------------|---------|----------|---------|----------|------------|
| Compile errors | partial | no | no | no | no | no | no | no |
| Printf mismatches | yes | yes | no | no | no | no | no | no |
| Unused code | no | yes (unused) | no | no | yes (functions) | no | no | no |
| Nil panics | no | no | no | **yes** | no | no | no | no |
| Security vulns (deps) | no | no | **yes** | no | no | no | no | no |
| Security vulns (code) | no | yes (gosec) | no | no | no | no | no | no |
| Style/formatting | no | yes | no | no | no | no | no | no |
| Race conditions | no | no | no | no | no | no | no | no |
| Dead functions | no | partial | no | no | **yes** | no | no | no |
| Cyclomatic complexity | no | partial (gocyclo) | no | no | no | **yes** | no | yes |
| Cognitive complexity | no | partial (gocognit) | no | no | no | no | **yes** | no |
| Maintainability index | no | no | no | no | no | no | no | **yes** |

**Key insight:** No single tool covers everything. The combination of all 8 tools + `go test -race` gives comprehensive coverage.
