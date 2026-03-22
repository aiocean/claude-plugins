---
name: aio-golang-mastery
description: Use when writing, reviewing, scanning, or linting Go code. Lint mode runs the full 7-step tooling chain (go build, go vet, golangci-lint, govulncheck, nilaway, deadcode, race detection) and applies idiomatic fixes. Also use for Go best practices, concurrency, error handling, testing, gRPC, goroutines, channels. Covers idiomatic patterns, generics, TDD, and production hardening based on Google/Uber style guides. For Go TUI apps, combine with aio-tui.
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
| Static analysis | govulncheck, nilaway, deadcode, golangci-lint | [Static Analysis](references/static-analysis.md) |
| Naming & style | MixedCaps, short names, package naming, imports | This file |

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
| 3 | `golangci-lint run ./...` | Style, bugs, performance, security |
| 4 | `govulncheck ./...` | Known CVEs in dependencies and stdlib |
| 5 | `nilaway ./...` | Nil pointer panics before runtime |
| 6 | `deadcode ./...` | Unreachable/unused functions |
| 7 | `go test -race ./...` | Data races |

See [Static Analysis reference](references/static-analysis.md) for install, config, and suppression patterns.

### golangci-lint Configuration (.golangci.yml)

```yaml
linters:
  enable:
    - errcheck
    - gosimple
    - govet
    - ineffassign
    - staticcheck
    - unused
    - gofmt
    - goimports
    - misspell
    - unconvert
    - unparam

linters-settings:
  errcheck:
    check-type-assertions: true
  govet:
    check-shadowing: true

issues:
  exclude-use-default: false
```
