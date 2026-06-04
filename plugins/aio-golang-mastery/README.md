::install-command
/plugin install aio-golang-mastery@aiocean-plugins
::

# aio-golang-mastery

Go rewards developers who internalize its idioms deeply. The language is deliberately small, but the gap between code that compiles and code that a Go team would actually merge is wider than most newcomers expect. Initialisms spelled correctly, error strings without capital letters, context always as the first parameter, receivers consistent across a type, imports in three clean groups — none of these are enforced by the compiler, but all of them matter for maintainability.

This plugin encodes that knowledge in two operating modes: an active lint pipeline that catches real problems in your code, and a reference layer that answers "what is the idiomatic Go way to do this?" with concrete, production-tested patterns.

## Lint mode

When you have Go code to review, the skill runs a 7-tool chain in order and applies idiomatic fixes to every finding:

| Step | Tool | What it catches |
|---|---|---|
| 1 | `go build ./...` | Compilation errors |
| 2 | `go vet ./...` | Suspicious constructs, printf mismatches |
| 3 | `golangci-lint run ./...` | Style, bugs, performance, security, naming |
| 4 | `govulncheck ./...` | Known CVEs in dependencies and stdlib |
| 5 | `nilaway ./...` | Nil pointer dereferences before runtime |
| 6 | `deadcode ./...` | Unreachable functions |
| 7 | `go test -race -count=1 ./...` | Data races |

Findings are grouped by severity (critical CVEs and races first, style last), fixed using the reference patterns below, then verified by re-running the full chain. Any tool not installed is noted and skipped.

The golangci-lint configuration bundled with the skill is production-grade v2 syntax — a curated set covering correctness, concurrency safety, resource leaks, security, and naming enforcement via a 21-rule revive config. It includes the exclusion blocks that prevent false positives on test files, generated proto code, and legitimate global patterns like sentinel errors and build-info variables.

## Reference mode

Ask about any Go topic and the skill loads the relevant reference document rather than generating from memory:

- Concurrency — worker pools, fan-out/fan-in, errgroup, pipeline, goroutine leak prevention
- Error handling — wrapping with `%w`, sentinel errors, custom error types, the handle-once rule
- Interfaces — small interfaces, functional options, dependency injection, composition patterns
- Generics — type constraints, generic data structures, `Result[T]`, range-over-func iterators (Go 1.23+)
- Testing — TDD, table-driven tests, benchmarks, fuzzing, mocking, golden files
- Project structure — standard layout, go.mod, go.work, Dockerfile, Makefile
- Production hardening — graceful shutdown, structured logging with slog, rate limiting, health checks
- gRPC — protobuf design, interceptors, streaming, bufconn testing
- Static analysis — govulncheck, nilaway, deadcode, golangci-lint install and configuration
- Naming and style — the full linter-tier decision table (MUST / SHOULD / AVOID), revive rule catalog

Patterns are sourced from the Google Go Style Guide, the Uber Go Style Guide, and Effective Go, updated for Go 1.25.

## Install

```bash
/plugin install aio-golang-mastery@aiocean-plugins
```

Trigger phrases: "go code", "golang", "lint go", "review go", "go best practices", "concurrency", "goroutines", "channels", "error handling", "gRPC", "race condition", "generics", "idiomatic go", "go testing", "govulncheck", "nilaway", "deadcode", "golangci-lint", "go lint pipeline", "go static analysis", "go code quality".
