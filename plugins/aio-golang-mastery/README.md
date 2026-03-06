# aio-golang-mastery

Production-grade Go development skill covering everything you need to write idiomatic, maintainable Go code.

## Install

```bash
/plugin install aio-golang-mastery@aiocean-plugins
```

## What It Covers

- **Naming & style** — MixedCaps, initialisms, package naming, import organization
- **Error handling** — wrapping with `%w`, sentinel errors, custom types, handle-once rule
- **Concurrency** — worker pools, errgroup, fan-out/fan-in, pipelines, goroutine leak prevention
- **Interfaces** — small interfaces, functional options, dependency injection, composition
- **Generics** — type constraints, generic data structures, Result[T], iterators (Go 1.23+)
- **Testing** — TDD, table-driven tests, benchmarks, fuzzing, mocking, golden files
- **Project structure** — standard layout, go.mod, go.work, Dockerfile, Makefile
- **Production hardening** — graceful shutdown, slog, rate limiting, circuit breaker, health checks
- **gRPC** — protobuf design, interceptors, streaming, bufconn testing
- **Static analysis** — govulncheck, nilaway, deadcode, golangci-lint, complexity tools

## Based On

- [Google Go Style Guide](https://google.github.io/styleguide/go/)
- [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md)
- [Effective Go](https://go.dev/doc/effective_go)
- Updated for Go 1.25
