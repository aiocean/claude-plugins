---
name: aio-golang-mastery
description: |
  Write, review, and lint Go code. Lint mode runs go build, go vet, golangci-lint, govulncheck, nilaway, deadcode, and race detection, then applies idiomatic fixes. Reference mode covers concurrency, error handling, generics, testing, gRPC, and production hardening.
when_to_use: go code, golang, lint go, review go, go best practices, concurrency, goroutines, channels, error handling, gRPC, race condition, generics, idiomatic go, go testing, govulncheck, nilaway, deadcode, golangci-lint
---

## Environment
- go: !`go version 2>/dev/null || echo "NOT INSTALLED"`
- golangci-lint: !`golangci-lint version --short 2>/dev/null || echo "NOT INSTALLED"`
- govulncheck: !`which govulncheck 2>/dev/null || echo "NOT INSTALLED"`

# Go Mastery

## Lint Mode (when user has Go code to review)

Use this mode to systematically lint and fix a Go codebase using the full tooling chain.

### Step 1: RUN
Execute the 7-step tooling chain in order. Capture all output:
```bash
go build ./...                    # 1. Compilation errors
go vet ./...                      # 2. Suspicious constructs
golangci-lint run ./...           # 3. Style, bugs, performance, security
govulncheck ./...                 # 4. Known CVEs in deps
nilaway ./...                     # 5. Nil pointer dereference detection
deadcode ./...                    # 6. Unreachable functions
go test -race -count=1 ./...     # 7. Data races
```
Skip any tool that is not installed (check Environment above) and note it in the report.

### Step 2: ANALYZE
Parse all tool output and group findings:

| Severity | Source | Examples |
|----------|--------|----------|
| **Critical** | govulncheck, race detection | Known CVEs, data races |
| **High** | go vet, nilaway | Nil derefs, printf mismatches, suspicious constructs |
| **Medium** | golangci-lint | Style violations, inefficient code, unchecked errors |
| **Low** | deadcode | Unused functions (safe to remove) |

### Step 3: FIX
For each finding, apply the idiomatic Go fix using the reference patterns below. Prioritize critical and high severity first. Common fix mappings:
- Unchecked error -> add explicit `if err != nil` handling
- Nil deref -> add nil guard or restructure control flow
- Race condition -> add mutex, use atomic, or redesign with channels
- Dead code -> remove or gate behind build tag
- CVE -> update dependency with `go get pkg@latest`

### Step 4: VERIFY
Re-run the full tooling chain to confirm all fixes. Repeat Step 3 for any remaining findings.

---

## Reference Mode (patterns and knowledge)

Production-grade Go patterns from Google, Uber, and the Go team. Updated for Go 1.25.

## Quick Decision Table

| Need | Solution | Reference |
|------|----------|-----------|
| Error handling rules | Return errors, wrap with %w, handle once | [Error Handling](references/error-handling.md) |
| Concurrency patterns | Worker pool, fan-out/fan-in, pipeline, errgroup | [Concurrency](references/concurrency.md) |
| Interface design | Small interfaces, accept interfaces return structs, DI | [Interfaces](references/interfaces.md) |
| Generics | Type constraints, generic data structures, Result[T] | [Generics](references/generics.md) |
| Testing | TDD, table-driven, benchmarks, fuzzing, mocking | [Testing](references/testing.md) |
| Project layout | cmd/, internal/, pkg/, Dockerfile, Makefile | [Project Structure](references/project-structure.md) |
| Production hardening | Graceful shutdown, rate limiting, health checks, slog | [Production](references/production.md) |
| gRPC services | Protobuf, interceptors, streaming, bufconn testing | [gRPC](references/grpc.md) |
| Static analysis | govulncheck, nilaway, deadcode, golangci-lint, revive | [Static Analysis](references/static-analysis.md) |
| Naming, style & linter enforcement | Naming decision table, linter tiers (MUST/SHOULD/AVOID), production `.golangci.yml` v2, grep-based review | [Naming & Style](references/naming-and-style.md) |

## Core Principles (in order)

1. **Clarity** - purpose and rationale are obvious to the reader
2. **Simplicity** - accomplishes the goal in the simplest way
3. **Concision** - high signal to noise ratio
4. **Maintainability** - easy to modify correctly
5. **Consistency** - matches surrounding codebase

## Naming Conventions

```go
// MixedCaps for exported, mixedCaps for unexported
type HTTPClient struct{}  // Initialisms: all caps (HTTP, URL, ID, API, JSON)
func ServeHTTP()          // Not ServeHttp

// Short variable names for short scopes
for i, v := range items { ... }
func (s *Server) Handle() // Receiver: 1-2 letter abbreviation

// Package names: short, lowercase, no underscores, no plurals
package http    // Good
package utils   // Bad: meaningless name
package models  // Bad: plural

// Don't repeat package name in exported names
package user
func New() *User       // Good: user.New()
func NewUser() *User   // Bad: user.NewUser()
```

## Import Organization

```go
import (
    // Standard library
    "context"
    "fmt"
    "net/http"

    // External packages
    "github.com/gin-gonic/gin"
    "go.uber.org/zap"

    // Internal packages
    "github.com/myorg/myapp/internal/config"
)
```

Rules: three groups separated by blank lines. Never rename imports unless conflict. Never dot imports. Blank imports (`_ "pkg"`) only in main or test files.

## Pointer vs Value Receivers

| Use pointer receiver (`*T`) | Use value receiver (`T`) |
|----------------------------|------------------------|
| Method mutates the receiver | Method does not mutate |
| Struct is large | Struct is small (few fields, no pointers) |
| Consistency: other methods use pointer | Type is a map, func, or chan |
| Must satisfy interface with pointer methods | Basic types (int, string) |

**Rule: don't mix.** Pick one style per type.

## Slices and Maps

```go
// Prefer nil slice (behaves like empty for most ops)
var s []string           // Good: nil, len=0, JSON marshals to null
s := []string{}          // Only when you need JSON [] instead of null

// Preallocate when size is known
results := make([]Result, 0, len(items))

// Copy at API boundaries to prevent mutation
func (s *Store) GetIDs() []string {
    return slices.Clone(s.ids)
}

// Use standard library (Go 1.21+)
slices.Sort(items)
slices.Contains(items, target)
maps.Clone(m)
maps.Keys(m)
```

## Modern Go Features

```go
// Range-over-func iterators (Go 1.23+)
func All[K, V any](m map[K]V) iter.Seq2[K, V] {
    return func(yield func(K, V) bool) {
        for k, v := range m {
            if !yield(k, v) { return }
        }
    }
}

// Tool directives in go.mod (Go 1.24+)
// tool (
//     golang.org/x/tools/cmd/stringer
//     github.com/golang/mock/mockgen
// )

// Typed atomics (Go 1.19+)
var count atomic.Int64
count.Add(1)

// errors.Join (Go 1.20+)
err := errors.Join(err1, err2, err3)

// slog structured logging (Go 1.21+)
slog.Info("request", "method", r.Method, "path", r.URL.Path, "status", status)
```

## Go Idioms (Quick Reference)

| Idiom | Description |
|-------|-------------|
| Accept interfaces, return structs | Functions take interface params, return concrete types |
| Errors are values | Treat errors as data, not exceptions |
| Make the zero value useful | Types work without explicit init |
| A little copying > a little dependency | Avoid unnecessary deps |
| Return early | Handle errors first, keep happy path unindented |
| Don't communicate by sharing memory | Use channels for goroutine coordination |
| Prefer synchronous functions | Let callers add concurrency |
| Channel buffer: 0 or 1 | Justify anything larger |
| Handle errors once | Don't log AND return an error |

## Anti-Patterns

```go
// Bad: naked returns in long functions
func process() (result int, err error) {
    // ... 50 lines ...
    return  // What is being returned?
}

// Bad: panic for control flow (use only for truly unrecoverable states)
func GetUser(id string) *User {
    user, err := db.Find(id)
    if err != nil { panic(err) }
    return user
}

// Bad: context in struct field
type Request struct {
    ctx context.Context  // Context should be first param
    ID  string
}

// Bad: ignoring errors silently
result, _ := doSomething()

// Bad: error strings with capital or punctuation
fmt.Errorf("Failed to connect.")  // Wrong
fmt.Errorf("connect to db: %w", err)  // Correct
```

## Tooling

```bash
# Essential (run all before merge)
go vet ./...                    # Compiler-level static analysis
golangci-lint run ./...         # Comprehensive linting (50+ linters)
go test -race ./...             # Race detection
go test -cover -coverprofile=coverage.out ./...

# Deep static analysis (run during code review)
govulncheck ./...               # CVE vulnerability scanner (Go team official)
nilaway ./...                   # Nil pointer dereference detection (Uber)
deadcode ./...                  # Find unreachable functions (Go team official)

# Build
CGO_ENABLED=0 go build -o app ./cmd/server
go build -ldflags "-X main.version=1.0.0" ./cmd/server

# Module
go mod tidy                     # Clean dependencies
go mod verify                   # Verify checksums
```

### Code Review Checklist (tools to run)

| Step | Tool | What it catches |
|------|------|-----------------|
| 1 | `go build ./...` | Compilation errors |
| 2 | `go vet ./...` | Suspicious constructs, printf mismatches |
| 3 | `golangci-lint run ./...` | Style, bugs, performance, security, naming (via `revive`) |
| 4 | `govulncheck ./...` | Known CVEs in dependencies and stdlib |
| 5 | `nilaway ./...` | Nil pointer panics before runtime |
| 6 | `deadcode ./...` | Unreachable/unused functions |
| 7 | `go test -race ./...` | Data races |

See [Static Analysis reference](references/static-analysis.md) for install, config, and suppression patterns.
See [Naming & Style](references/naming-and-style.md) for the linter-tier decision (MUST / SHOULD / AVOID), `revive` rule catalog, and a copy-pasteable production-grade config.

### golangci-lint Configuration (.golangci.yml — v2 syntax, production-grade)

A minimal-but-real config. The full annotated version (with exclusion blocks for `gochecknoglobals` legitimate-globals, generated proto code, ldflag build vars, Lua scripts, and tier-3 linter warnings) lives in [Naming & Style §3](references/naming-and-style.md#3-production-grade-golangciyml-v2-syntax).

```yaml
version: "2"

run:
  timeout: 5m
  modules-download-mode: readonly

linters:
  enable:
    # correctness
    - errcheck
    - govet
    - staticcheck         # absorbs gosimple in v2
    - unused
    - ineffassign
    - unconvert

    # concurrency & race conditions
    - copyloopvar         # loop variable capture safety net

    # resource leaks
    - bodyclose           # unclosed HTTP response bodies
    - noctx               # HTTP requests without context

    # security
    - gosec

    # bugs & correctness
    - durationcheck       # time.Duration * time.Duration = wrong
    - reassign            # mutating package-level vars
    - wastedassign
    - musttag             # missing struct tags
    - protogetter         # proto getter for nil safety

    # style & convention
    - misspell
    - gocritic
    - revive              # ← the naming/style enforcer (see §revive below)

    # globals & init hygiene (Tier 2 — needs exclusions below)
    - gochecknoglobals
    - gochecknoinits
    - interfacebloat
    - predeclared

  settings:
    errcheck:
      check-type-assertions: true
      check-blank: true

    govet:
      enable-all: true       # all analyzers (shadow, copylocks, loopclosure, ...)
      disable:
        - fieldalignment     # too noisy, micro-optimization

    gosec:
      excludes:
        - G104               # errcheck covers
        - G304               # file path from variable — expected in CLI
      severity: medium
      confidence: medium

    gocritic:
      enabled-tags: [diagnostic, performance]
      disabled-checks: [hugeParam]

    revive:
      # 21-rule production set — names + errors + context + idioms.
      # Each rule documented at references/naming-and-style.md §1.
      rules:
        # Naming
        - {name: var-naming}
        - {name: receiver-naming}
        - {name: error-naming}
        - {name: time-naming}
        - {name: package-comments}
        - {name: exported}
        # Errors
        - {name: error-return}
        - {name: error-strings}
        - {name: errorf}
        # Context
        - {name: context-as-argument}
        - {name: context-keys-type}
        # Imports
        - {name: blank-imports}
        # Control flow
        - {name: if-return}
        - {name: indent-error-flow}
        - {name: superfluous-else}
        - {name: unreachable-code}
        - {name: empty-block}
        # Idioms
        - {name: increment-decrement}
        - {name: range}
        - {name: unexported-return}
        - {name: defer}

    musttag:
      functions:
        - {name: encoding/json.Marshal, tag: json}
        - {name: encoding/json.Unmarshal, tag: json}

  exclusions:
    rules:
      - path: _test\.go
        linters: [errcheck, gocritic, gosec, musttag, gochecknoglobals]
      - path: pkg/         # generated proto code
        linters: [musttag, protogetter, revive, gochecknoglobals]
      # gochecknoglobals — legitimate Go patterns
      - linters: [gochecknoglobals]
        text: "^(Version|Commit|BuildDate|BuildTime|GitSHA) is a global variable$"
      - linters: [gochecknoglobals]
        text: "^Err[A-Z]"   # sentinel errors

# Formatters live in their own block in v2 (not inside `linters`)
formatters:
  enable:
    - gofmt
    - goimports

issues:
  max-issues-per-linter: 50
  max-same-issues: 5
```

> **v2 canonical structure**: `linters.settings`, `linters.exclusions.rules`, and a separate top-level `formatters` block. Legacy top-level `linters-settings:` and `issues.exclude-rules:` still work at runtime but fail `golangci-lint config verify`. Use canonical form for clean CI.

**Linter tier discipline** — full rationale at [Naming & Style §2](references/naming-and-style.md#2-linter-tiers--what-to-enable):

- **Tier 1 MUST** (very low FP rate): `errcheck`, `govet`, `staticcheck`, `unused`, `ineffassign`, `unconvert`, `bodyclose`, `noctx`, `copyloopvar`, `durationcheck`, `reassign`, `wastedassign`, `musttag`, `protogetter`, `gosec`, `gocritic`, `misspell`, `revive`.
- **Tier 2 SHOULD with exclusions**: `gochecknoglobals`, `gochecknoinits`, `interfacebloat`, `predeclared`.
- **Tier 3 AVOID without strong reason**: `tagliatelle` (defaults to camelCase — fights snake_case wire formats), `varnamelen` (fights Go's "short scope short name" idiom), `wsl`, `lll`, `funlen`, `gocyclo` (use `gocognit` instead), `nlreturn`.

### Migrating from v1 config

If your repo still uses v1 syntax, three fixes:
1. Remove `gosimple` (merged into `staticcheck` in v2)
2. Move `gofmt` and `goimports` from `linters:` into a top-level `formatters:` block
3. Replace `govet.check-shadowing: true` with `govet.enable-all: true` and disable `fieldalignment`

Or run `golangci-lint migrate` for automatic translation.
