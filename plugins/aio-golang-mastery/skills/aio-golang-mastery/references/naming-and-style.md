# Naming, Style & Linter Enforcement

This reference is the **enforcement counterpart** to the Naming Conventions section in `SKILL.md`. SKILL.md tells you *what* good Go naming looks like; this file tells you *how* to make the compiler and linter enforce it for you so reviewers stop arguing over `Http` vs `HTTP` in 2026.

Authoritative sources, in priority order:

1. [Effective Go — Names](https://go.dev/doc/effective_go#names) — the canonical Go team document
2. [Go Code Review Comments — Naming](https://go.dev/wiki/CodeReviewComments) — the rules every Googler reviews against
3. [Google Go Style Guide](https://google.github.io/styleguide/go/) — extended rules and rationale
4. [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md) — production patterns that compile-down to enforceable lint rules

If a project's CLAUDE.md / AGENTS.md / team style guide contradicts these, the project wins — match the surrounding codebase before satisfying personal preference. Consistency beats correctness-of-style.

---

## 1. Naming Decision Table — Identifier → Convention → Linter Rule

Every row is mechanically enforceable. If a rule is violated, a linter will catch it — you do not need to remember the rule, only enable the rule.

| Identifier kind | Convention | Example (good) | Example (bad) | Linter rule |
|---|---|---|---|---|
| Exported func / type / var | `MixedCaps` | `ServeHTTP`, `UserStore` | `serve_http`, `userstore` | `revive: var-naming` |
| Unexported | `mixedCaps` | `parseToken`, `httpClient` | `parse_token`, `HTTPclient` | `revive: var-naming` |
| Initialism (HTTP, URL, JSON, ID, API, SQL, UUID, IP, TLS, AWS, SHA, RPC) | ALL CAPS in identifier | `HTTPClient`, `userID`, `parseJSON` | `HttpClient`, `userId`, `parseJson` | `revive: var-naming` |
| Sentinel error | `var ErrXxx = errors.New(...)` | `ErrNotFound`, `ErrCircuitOpen` | `NotFoundErr`, `errNotFound` | `revive: error-naming` |
| Error type | `XxxError` suffix | `ValidationError`, `ParseError` | `ErrorValidation` | `revive: error-naming` |
| Error returning function | error is last return value | `func F() (T, error)` | `func F() (error, T)` | `revive: error-return` |
| Error message text | lowercase, no trailing punctuation | `"connect to db: %w"` | `"Failed to connect."` | `revive: error-strings` |
| Receiver name | 1-2 letters, **consistent per type** | `func (s *Server)` everywhere | `func (s *Server)` here, `func (srv *Server)` there | `revive: receiver-naming` |
| Receiver pronouns | NEVER `self`, `this`, `me` | `s`, `srv` | `self`, `this` | `revive: receiver-naming` |
| Time-related identifier | suffix unit when ambiguous | `timeoutSec`, `pollIntervalMillis`, `cacheTTL` | `timeout`, `interval` (unit hidden) | `revive: time-naming` |
| Boolean | leading verb | `isReady`, `hasItems`, `canRetry` | `ready`, `items` | (manual) |
| Getter | drop `Get` prefix in Go | `func (u *User) Name() string` | `func (u *User) GetName() string` | `revive: get-return` (opt-in) |
| Setter | keep `Set` prefix | `func (u *User) SetName(n string)` | `func (u *User) WithName(n string)` (builder) | (manual) |
| Package | short, lowercase, no underscore, **singular** | `package http`, `package user` | `package HTTP_utils`, `package models` | `revive: var-naming` |
| Package no repetition in symbol | function name does not repeat package | `user.New`, `http.Client` | `user.NewUser`, `http.HTTPClient` | (manual review) |
| Package comment | `// Package X ...` on doc line | `// Package config loads config.` | `// config loads config.` | `revive: package-comments` |
| Exported symbol doc | every exported symbol has doc comment | `// User represents...\ntype User struct{}` | `type User struct{}` (no doc) | `revive: exported` |
| Constants | same as func — `MaxRetries`, `defaultTimeout` | `MaxRetries`, `defaultTimeout` | `MAX_RETRIES`, `DefaultTimeout_` | `revive: var-naming` |
| Test names | `TestFunctionName_Scenario_Expected` | `TestParseToken_InvalidJWT_ReturnsError` | `TestCase1`, `Test_parse_token` | (manual) |
| Subtest names | `t.Run("scenario", ...)` lowercase | `t.Run("invalid token", ...)` | `t.Run("InvalidToken", ...)` | (style choice) |
| Context as parameter | always first param | `func F(ctx context.Context, ...)` | `func F(x string, ctx context.Context)` | `revive: context-as-argument` |
| Context value keys | custom type, never `string`/`int` | `type ctxKey struct{}` | `ctx.Value("user")` | `revive: context-keys-type` |
| Blank import | only in `main` or `_test.go` | `_ "github.com/lib/pq"` in main | scattered | `revive: blank-imports` |

**Operational rule**: every "manual review" row in the table above is a row that *should* be a linter rule. If your team finds itself repeatedly flagging the same naming issue in PRs, write a custom revive rule or a CI grep step. Manual review does not scale.

---

## 2. Linter Tiers — What to Enable

Three tiers, in this order: **MUST**, **SHOULD with exclusions**, **DO NOT enable blindly**.

### Tier 1 — MUST Enable (production baseline, no debate)

These linters have very low false-positive rates and catch real bugs / convention violations. Skipping them is leaving lint coverage on the table.

| Linter | Catches | False-positive risk |
|---|---|---|
| `errcheck` | Unhandled error returns | low |
| `govet` (with `enable-all`) | All Go team analyzers: copylocks, loopclosure, atomic, shadow, printf, ... | very low |
| `staticcheck` | 150+ advanced checks (replaces gosimple in v2) | low |
| `unused` | Unused vars, consts, types, fields | low |
| `ineffassign` | Assignments whose value is never read | very low |
| `unconvert` | Redundant type conversions | very low |
| `bodyclose` | Unclosed HTTP response bodies | low |
| `noctx` | HTTP requests without context (cancel/timeout leak) | low |
| `copyloopvar` | Loop variable captured by closure / goroutine (Go 1.22 fixed but still useful for older code) | very low |
| `durationcheck` | `time.Duration * time.Duration` → almost always a bug | very low |
| `reassign` | Reassigning package-level vars (often a mutation bug) | low |
| `wastedassign` | Assignments that are overwritten before use | very low |
| `protogetter` | Proto field access via direct field instead of getter (nil-safe) | low — only flags proto types |
| `gosec` | OWASP security issues (G101 hardcoded creds, G201 SQL injection, etc.) | medium — needs exclusion list, see §3 |
| `gocritic` | 100+ diagnostic + performance + style checks | medium — opinionated, configure tags |
| `misspell` | Spelling errors in identifiers and comments | very low |
| `musttag` | Missing required struct tags (json, yaml, ...) | low |
| **`revive`** | **Style + convention (replaces deprecated `golint`)** | **low — but config-driven, see §3** |

**Formatters (separate from linters in v2)**:

| Formatter | Purpose |
|---|---|
| `gofmt` | Canonical Go formatting |
| `goimports` | Sort imports + add missing |

### Tier 2 — SHOULD Enable (high value, needs exclusions)

These catch real issues but flag legitimate Go idioms. Always pair them with an `issues.exclude-rules` block — never bare.

| Linter | Catches | Required exclusions |
|---|---|---|
| `gochecknoglobals` | Mutable package-level vars (CLAUDE.md / Uber style cap) | exclude `Version`/`Commit`/`BuildDate` ldflag vars, `rueidis.NewLuaScript(...)` immutable scripts, lipgloss styles, sentinel `Err...`, registry maps, `_test.go` fixtures |
| `gochecknoinits` | `init()` functions with side effects | exclude OTel / database driver registration, `metrics.MustRegister`, generated code |
| `interfacebloat` | Interfaces with >10 methods (smell) | usually no exclusion needed — zero findings on healthy codebases |
| `predeclared` | Shadowing predeclared identifiers (`len`, `error`, `new`, ...) | usually no exclusion — zero findings on healthy codebases |

### Tier 3 — DO NOT Enable Blindly (high noise, low signal)

These linters have valid use cases but trigger false-positive avalanches on idiomatic Go. Enable only if you've configured them carefully and your team understands the tradeoff.

| Linter | Why it floods | When it's actually useful |
|---|---|---|
| `tagliatelle` | Defaults to camelCase tags. **Wire formats are often snake_case** (Shopify, Stripe, AWS, protobuf-via-jsonpb). Will flag your entire `internal/canonical/` package as wrong. | Only when you have a strict house style for tag casing AND it matches your wire format. Configure `case.rules.json: snake` to invert. |
| `varnamelen` | Flags `for i, v := range`, `tx := db.Begin()`, `c := make(chan ...)`. **Go idiom says short scope → short name**, this linter does not understand scope length. | Almost never. Manual review catches the few real cases (5-letter param in 200-line function). |
| `wsl` (whitespace linter) | Enforces blank-line policy that conflicts with `gofmt`'s opinions. Personal taste, not consensus. | If your team agrees on a strict whitespace house style. |
| `lll` (line length) | Punishes long but readable lines (URLs, table-driven test cases, struct literals with comments). | If your style guide caps line length and your team agrees. |
| `funlen` | Caps function length. Forces premature extraction. | Only as a guideline, not a CI block. |
| `gocyclo` | Older complexity metric; less Go-aware than `gocognit`. | Use `gocognit` instead. |
| `nlreturn` | Insists on blank line before every return. Conflicts with terse Go style. | Personal taste. |
| `gofumpt` (in formatter slot) | Stricter than gofmt. Can fight with editor save-on-format. | If your team agrees on the stricter rules. |

**Rule of thumb**: a linter belongs in Tier 1/2 if a violation is *almost always* a bug or a convention break. It belongs in Tier 3 if a violation is *often* a deliberate idiomatic choice.

---

## 3. Production-Grade `.golangci.yml` (v2 syntax)

Tested on Go 1.25, golangci-lint v2.x. Drop this in your repo root, adjust the project-specific exclusions, and your CI now enforces every rule in §1 + §2.

```yaml
version: "2"

run:
  timeout: 5m
  modules-download-mode: readonly

linters:
  enable:
    # ---- Tier 1: MUST ----
    # Correctness
    - errcheck
    - govet
    - staticcheck
    - unused
    - ineffassign
    - unconvert

    # Concurrency
    - copyloopvar       # loop variable capture (safety net for goroutines)

    # Resource leaks
    - bodyclose         # unclosed HTTP response bodies
    - noctx             # HTTP requests without context (cancel/timeout leak)

    # Security
    - gosec             # OWASP security scanner

    # Bugs & correctness
    - durationcheck     # time.Duration * time.Duration = wrong
    - reassign          # reassigning package-level variables
    - wastedassign      # assignments that are never read
    - musttag           # missing struct tags (json, etc.)
    - protogetter       # proto field access via getter (nil-safe)

    # Style & convention
    - misspell
    - gocritic
    - revive            # the naming/style enforcer — config below

    # ---- Tier 2: SHOULD (needs exclusions below) ----
    - gochecknoglobals
    - gochecknoinits
    - interfacebloat
    - predeclared

  settings:
    errcheck:
      check-type-assertions: true
      check-blank: true

    govet:
      enable-all: true     # all analyzers: copylocks, loopclosure, atomic, shadow, ...
      disable:
        - fieldalignment   # too noisy, perf micro-optimization

    gosec:
      excludes:
        - G104             # unhandled error — errcheck already covers
        - G304             # file path from variable — expected in CLI/config code
      severity: medium
      confidence: medium

    misspell:
      locale: US

    gocritic:
      enabled-tags:
        - diagnostic
        - performance
      disabled-checks:
        - hugeParam        # too noisy for proto messages and ORM structs

    revive:
      # The 21-rule production set. Each rule is documented in §1.
      rules:
        # Naming
        - name: var-naming
        - name: receiver-naming
        - name: error-naming
        - name: time-naming
        - name: package-comments
        - name: exported

        # Errors
        - name: error-return
        - name: error-strings
        - name: errorf

        # Context
        - name: context-as-argument
        - name: context-keys-type

        # Imports
        - name: blank-imports

        # Control flow
        - name: if-return
        - name: indent-error-flow
        - name: superfluous-else
        - name: unreachable-code
        - name: empty-block

        # Idioms
        - name: increment-decrement
        - name: range
        - name: unexported-return
        - name: defer

    musttag:
      functions:
        - name: encoding/json.Marshal
          tag: json
        - name: encoding/json.Unmarshal
          tag: json

  exclusions:
    rules:
      # ---- Test files: relax ----
      - path: _test\.go
        linters:
          - errcheck
          - gocritic
          - gosec
          - musttag
          - gochecknoglobals    # test fixtures often package-level

      - path: tests/
        linters:
          - errcheck
          - gosec
          - gochecknoglobals

      # ---- Generated proto code: relax ----
      - path: pkg/
        linters:
          - musttag
          - protogetter
          - revive
          - gochecknoglobals    # generated registry vars

      # ---- gochecknoglobals: legitimate Go idioms ----
      - linters: [gochecknoglobals]
        text: "^(Version|Commit|BuildDate|BuildTime|GitSHA) is a global variable$"
        # ldflag-injected build metadata — standard Go release pattern

      - linters: [gochecknoglobals]
        text: "Script is a global variable"
        # rueidis.NewLuaScript / redis.NewScript — immutable script objects

      - linters: [gochecknoglobals]
        text: "^Err[A-Z]"
        # Sentinel errors — var ErrNotFound = errors.New(...) is correct Go

      # ---- gochecknoinits: legitimate registration ----
      - linters: [gochecknoinits]
        path: "(otel|telemetry|prometheus|metrics)/"
        # OTel / Prometheus registration in init() is idiomatic

      # ---- revive: package-comments only on package's primary file ----
      # (revive flags every file without `// Package X` — most codebases only
      # want it on the doc.go or first file. Adjust as needed.)

formatters:
  enable:
    - gofmt
    - goimports

issues:
  max-issues-per-linter: 50
  max-same-issues: 5
```

> **v2 canonical structure (important)**: settings live under `linters.settings` (nested), exclusions live under `linters.exclusions.rules`, and `formatters` is a separate top-level block. Many older configs (and `golangci-lint migrate` output) leave `linters-settings:` and `issues.exclude-rules:` at the root — these still **run** under v2 backward-compat, but they **fail `golangci-lint config verify`**. Use the nested form for clean CI.

### Migrating From v1 Config

If your repo still uses v1 syntax, four points of friction:

1. **`gosimple` was merged into `staticcheck`**. Remove `gosimple` from `enable`.
2. **`gofmt` and `goimports` moved out of `linters`** into a separate top-level `formatters` block.
3. **`govet: check-shadowing: true` is deprecated**. Use `enable-all: true` (which includes `shadow`) and selectively disable noisy analyzers like `fieldalignment`.
4. **`linters-settings:` and `issues.exclude-rules:` should move under `linters.settings:` and `linters.exclusions.rules:`** for canonical v2. Required for `config verify` to pass.

Run `golangci-lint migrate` to auto-translate v1 → v2, then manually move settings/exclusions under `linters:` to pass `config verify`.

---

## 4. Grep-Based Naming Review (when no LSP / linter available)

Sometimes you review code in a PR diff viewer with no tooling. These grep patterns catch the high-frequency naming violations:

```bash
# 1. Initialism violations — `Http`, `Json`, `Url`, `Id`, `Api`, `Uuid`, `Sql`
rg -n '\b(Http|Json|Url|Api|Sql|Uuid|Xml|Json|Css|Html|Tcp|Udp|Tls|Ssl)[A-Z]?' --type go

# 2. Context not first param
rg -n 'func\s+(\w+\s+)?\w+\([^)]*,\s*ctx\s+context\.Context' --type go

# 3. Mutable package-level var that should be a constant
rg -n '^var\s+[a-zA-Z]+\s*=\s*"' --type go | rg -v '_test\.go'

# 4. Error string starting with capital or ending with period
rg -n 'errors\.New\("[A-Z]' --type go
rg -n 'errors\.New\(".*\.\")\)' --type go
rg -n 'fmt\.Errorf\("[A-Z]' --type go

# 5. Get-prefix on getter (idiomatic Go drops `Get`)
rg -n 'func \(\w+ [*]?\w+\) Get[A-Z]\w+\(\)' --type go

# 6. Receiver name inconsistency per type
# (compare receiver names across functions on the same type — manual)
rg -n 'func \(\w+ [*]?TypeName\)' --type go

# 7. Package name repetition in exported symbol
# e.g. in package user, find "func NewUser" or "type UserStore"
rg -n '^(func|type)\s+\w*PkgName\w*\b' --type go  # adapt PkgName

# 8. Hungarian notation (Go forbids prefixes like `str`, `int`, `arr`)
rg -n '\b(strName|intCount|arrItems|mapData|chErr|fnCb)\b' --type go

# 9. Init function with side effects (other than registration)
rg -B1 -A10 '^func init\(\)' --type go

# 10. Mutable global http.Client / sql.DB
rg -n '^var\s+\w+\s*=\s*&?(http\.Client|sql\.DB)' --type go
```

---

## 5. Naming Anti-Patterns — Quick Fixes

```go
// ---- ANTI-PATTERN: hidden initialism ----
type HttpClient struct{}
func (c *HttpClient) DoRequest()
//  → revive: var-naming
// FIX:
type HTTPClient struct{}
func (c *HTTPClient) DoRequest()


// ---- ANTI-PATTERN: error string with capital + period ----
return errors.New("Failed to parse the file.")
//  → revive: error-strings
// FIX:
return errors.New("parse file")


// ---- ANTI-PATTERN: "must" prefix without panic ----
func mustParseTime(s string) time.Time {
    t, err := time.Parse(time.RFC3339, s)
    if err != nil {
        return time.Time{}  // ← silently returns zero value!
    }
    return t
}
//  → Go convention: must* MUST panic. Otherwise rename.
// FIX (choose one):
func mustParseTime(s string) time.Time {
    t, err := time.Parse(time.RFC3339, s)
    if err != nil { panic(err) }   // option A: actually panic
    return t
}
// OR:
func parseTimeOrZero(s string) time.Time {   // option B: rename to match behavior
    t, _ := time.Parse(time.RFC3339, s)
    return t
}


// ---- ANTI-PATTERN: inconsistent receiver names ----
func (s *Server) Start() {}
func (srv *Server) Stop() {}
func (server *Server) Reload() {}
//  → revive: receiver-naming
// FIX: pick one, use everywhere
func (s *Server) Start() {}
func (s *Server) Stop() {}
func (s *Server) Reload() {}


// ---- ANTI-PATTERN: package name repetition ----
package user
type UserStore struct {}      // → user.UserStore is redundant
func NewUserStore() *UserStore // → user.NewUserStore is doubly redundant
// FIX:
package user
type Store struct {}           // → user.Store
func NewStore() *Store         // → user.NewStore


// ---- ANTI-PATTERN: snake_case identifier ----
var max_retries = 3
//  → revive: var-naming
// FIX:
const maxRetries = 3   // unexported constant; also: should be const not var


// ---- ANTI-PATTERN: stutter in nested type ----
type Server struct {
    ServerConfig Config   // → s.ServerConfig.Field stutters with type
}
// FIX:
type Server struct {
    Config Config         // → s.Config.Field
}


// ---- ANTI-PATTERN: mutable global http client ----
var httpClient = &http.Client{Timeout: 30 * time.Second}
//  → gochecknoglobals + reassignable mutable state
// FIX: inject as dependency
type Service struct {
    httpClient *http.Client
}
func NewService(client *http.Client) *Service {
    return &Service{httpClient: client}
}


// ---- ANTI-PATTERN: time unit hidden ----
type Config struct {
    Timeout int     // milliseconds? seconds? minutes?
}
//  → revive: time-naming
// FIX:
type Config struct {
    TimeoutSec     int           // explicit unit
    // OR (preferred for new code):
    Timeout        time.Duration // self-describing
}


// ---- ANTI-PATTERN: getter with Get prefix ----
func (u *User) GetName() string { return u.name }
//  → idiomatic Go drops Get
// FIX:
func (u *User) Name() string { return u.name }
```

---

## 6. Project-Onboarding Checklist (run once per new repo)

Copy-paste this checklist when bootstrapping a Go repo or auditing an existing one:

- [ ] `.golangci.yml` present and uses v2 syntax (`version: "2"`)
- [ ] `revive` is enabled with at least the 21-rule production set (see §3)
- [ ] `errcheck`, `govet enable-all`, `staticcheck`, `unused`, `ineffassign`, `unconvert` all enabled
- [ ] `gosec` enabled with project-appropriate exclusions
- [ ] `bodyclose` and `noctx` enabled (catches HTTP leaks)
- [ ] `musttag` enabled with `json` tag requirement for `encoding/json.Marshal`/`Unmarshal`
- [ ] `gochecknoglobals` enabled with exclusions for Version/Commit/BuildDate + sentinel errors + Lua scripts (if applicable)
- [ ] `gochecknoinits` enabled with exclusions for OTel/Prometheus registration
- [ ] `formatters` block has `gofmt` and `goimports`
- [ ] `tagliatelle`, `varnamelen`, `wsl`, `lll`, `funlen` NOT enabled (or only enabled with team-wide buy-in and explicit configuration)
- [ ] CI runs `golangci-lint run ./...` with `--timeout 5m` and fails the build on issues
- [ ] CI runs `govulncheck ./...` and fails on stdlib + dep CVEs
- [ ] CI runs `go test -race -count=1 ./...`
- [ ] CI runs `nilaway ./...` (or accepts known findings file)
- [ ] CI runs `deadcode ./...` (informational, not blocking)
- [ ] Repo has `Makefile` or `justfile` target that runs the full 7-step lint chain locally before push

If any box is unchecked, the codebase will silently drift toward inconsistency every sprint. Fix the gate, not each individual violation.
