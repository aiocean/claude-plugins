---
title: "aio-golang-mastery"
description: "Viết và lint Go idiomatic end-to-end — chuỗi lint 7 tool (build, vet, golangci-lint, govulncheck, nilaway, deadcode, race) cộng với reference chất lượng cao về concurrency, error, generics, gRPC, và production hardening."
document_type: "plugin"
version: "1.1.3"
install: "/plugin install aio-golang-mastery@aiocean-plugins"
skills_count: 1
---

> **Cài đặt:** `/plugin install aio-golang-mastery@aiocean-plugins` · `v1.1.3`

# aio-golang-mastery

Skill phát triển Go ở mức production, bao phủ mọi thứ cần thiết để viết code Go idiomatic và dễ bảo trì.

## Cài đặt

```bash
/plugin install aio-golang-mastery@aiocean-plugins
```

## Bao phủ những gì

- **Naming & style** — MixedCaps, initialisms, đặt tên package, tổ chức import
- **Error handling** — wrap với `%w`, sentinel errors, custom types, quy tắc handle-once
- **Concurrency** — worker pools, errgroup, fan-out/fan-in, pipelines, ngăn goroutine leak
- **Interfaces** — interface nhỏ, functional options, dependency injection, composition
- **Generics** — type constraints, generic data structures, Result[T], iterators (Go 1.23+)
- **Testing** — TDD, table-driven tests, benchmarks, fuzzing, mocking, golden files
- **Project structure** — layout chuẩn, go.mod, go.work, Dockerfile, Makefile
- **Production hardening** — graceful shutdown, slog, rate limiting, circuit breaker, health checks
- **gRPC** — thiết kế protobuf, interceptors, streaming, testing với bufconn
- **Static analysis** — govulncheck, nilaway, deadcode, golangci-lint, complexity tools

## Dựa trên

- [Google Go Style Guide](https://google.github.io/styleguide/go/)
- [Uber Go Style Guide](https://github.com/uber-go/guide/blob/master/style.md)
- [Effective Go](https://go.dev/doc/effective_go)
- Cập nhật cho Go 1.25

## Skills (1)

- [**aio-golang-mastery**](/vi/plugins/aio-golang-mastery/aio-golang-mastery) — Viết, review, và lint code Go. Lint mode chạy go build, go vet, golangci-lint, govulncheck, nilaway, deadcode, và race detection, sau đó áp dụng các bản fix idiomatic…
