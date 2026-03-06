# Project Structure

## Standard Layout

```
myproject/
├── cmd/
│   └── server/
│       └── main.go           # Entry point
├── internal/                 # Private (cannot be imported externally)
│   ├── handler/              # HTTP/gRPC handlers
│   ├── service/              # Business logic
│   └── repository/           # Data access
├── pkg/                      # Public library code (optional)
├── api/                      # API definitions (proto, OpenAPI)
├── testdata/                 # Test fixtures
├── go.mod
├── go.sum
├── Makefile
├── Dockerfile
└── .golangci.yml
```

**Rules:**
- `internal/` enforced by Go compiler — external packages cannot import
- `cmd/` for entry points — keep main() thin, inject dependencies
- Avoid `pkg/` unless you truly have a public API for external consumers

## go.mod

```go
module github.com/myorg/myapp

go 1.24

require (
    github.com/gin-gonic/gin v1.9.1
    go.uber.org/zap v1.26.0
)

// Local development
replace github.com/myorg/mylib => ../mylib

// Mark bad versions
retract v1.0.1  // Critical bug

// Tool dependencies (Go 1.24+)
tool (
    golang.org/x/tools/cmd/stringer
    github.com/golang/mock/mockgen
)
```

```bash
go mod tidy       # Add missing, remove unused
go mod download   # Download deps
go mod verify     # Verify checksums
go get -u ./...   # Update all deps
go mod graph      # Show dependency graph
```

## Monorepo with go.work

```
monorepo/
├── go.work
├── services/api/go.mod
├── services/worker/go.mod
└── shared/models/go.mod
```

```go
// go.work
go 1.24
use (
    ./services/api
    ./services/worker
    ./shared/models
)
```

## Avoid Package-Level State

```go
// Bad: global mutable state
var db *sql.DB
func init() { db, _ = sql.Open("postgres", os.Getenv("DB")) }

// Good: dependency injection
type Server struct{ db *sql.DB }
func NewServer(db *sql.DB) *Server { return &Server{db: db} }
```

## Package Naming

```go
package http     // Good: short, lowercase, no underscores
package user     // Good: singular noun
package httputil // Good: compound but concise

package utils       // Bad: meaningless
package userService // Bad: camelCase
package models      // Bad: plural
```

## Build Tags

```go
//go:build integration
package myapp

func TestIntegration(t *testing.T) { ... }
// Run: go test -tags=integration ./...

//go:build linux || darwin
//go:build amd64
package myapp
```

## Dockerfile (Multi-Stage)

```dockerfile
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

FROM alpine:latest
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/server /server
EXPOSE 8080
CMD ["/server"]
```

## Makefile

```makefile
.PHONY: build test lint run

build:
	go build -o bin/server ./cmd/server

test:
	go test -v -race -coverprofile=coverage.out ./...

lint:
	golangci-lint run ./...

run:
	go run ./cmd/server

build-all:
	GOOS=linux GOARCH=amd64 go build -o bin/server-linux ./cmd/server
	GOOS=darwin GOARCH=arm64 go build -o bin/server-darwin ./cmd/server
```

## Version Info via ldflags

```go
package version

var (
    Version   = "dev"
    GitCommit = "none"
    BuildTime = "unknown"
)
```

```bash
go build -ldflags "-X myapp/version.Version=1.0.0 \
  -X myapp/version.GitCommit=$(git rev-parse HEAD) \
  -X myapp/version.BuildTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)" ./cmd/server
```

## Configuration with envconfig

```go
type Config struct {
    Host    string        `envconfig:"SERVER_HOST" default:"0.0.0.0"`
    Port    int           `envconfig:"SERVER_PORT" default:"8080"`
    Timeout time.Duration `envconfig:"SERVER_TIMEOUT" default:"30s"`
    DBURL   string        `envconfig:"DATABASE_URL" required:"true"`
}

func Load() (*Config, error) {
    var cfg Config
    return &cfg, envconfig.Process("", &cfg)
}
```
