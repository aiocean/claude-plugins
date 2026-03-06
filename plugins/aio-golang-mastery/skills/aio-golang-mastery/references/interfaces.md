# Interface Design

## Core Rules

1. **Small, focused interfaces** — 1-2 methods. Compose for more.
2. **Accept interfaces, return structs** — flexible input, concrete output.
3. **Define interfaces where used** — consumer package, not provider.
4. **Compile-time verification**: `var _ io.Reader = (*MyReader)(nil)`

## Small Interfaces + Composition

```go
type Reader interface { Read(p []byte) (n int, err error) }
type Writer interface { Write(p []byte) (n int, err error) }
type Closer interface { Close() error }

// Compose as needed
type ReadWriteCloser interface { Reader; Writer; Closer }
```

## Define at Consumer, Not Provider

```go
// Good: consumer defines what it needs
package service

type UserStore interface {
    GetUser(ctx context.Context, id string) (*User, error)
    SaveUser(ctx context.Context, user *User) error
}

type Service struct { store UserStore }

// The concrete implementation doesn't know about this interface.
// Any type that has GetUser + SaveUser satisfies it implicitly.
```

## io.Reader/Writer Patterns

```go
// Chain readers
combined := io.MultiReader(header, body, footer)

// Duplicate reads (e.g., log + process)
logged := io.TeeReader(r, logWriter)

// Limit reads (prevent memory bombs)
limited := io.LimitReader(r, 1<<20)  // 1MB max

// Custom reader
type UppercaseReader struct{ src io.Reader }
func (u *UppercaseReader) Read(p []byte) (n int, err error) {
    n, err = u.src.Read(p)
    for i := 0; i < n; i++ {
        if p[i] >= 'a' && p[i] <= 'z' { p[i] -= 32 }
    }
    return
}
```

## Functional Options

```go
type Server struct {
    addr    string
    timeout time.Duration
    logger  *slog.Logger
}

type Option func(*Server)

func WithTimeout(d time.Duration) Option { return func(s *Server) { s.timeout = d } }
func WithLogger(l *slog.Logger) Option   { return func(s *Server) { s.logger = l } }

func NewServer(addr string, opts ...Option) *Server {
    s := &Server{addr: addr, timeout: 30 * time.Second, logger: slog.Default()}
    for _, opt := range opts {
        opt(s)
    }
    return s
}
```

## Interface Segregation

```go
// Bad: fat interface forces implementations to have unused methods
type Repository interface {
    Create(item Item) error
    Read(id string) (Item, error)
    Update(item Item) error
    Delete(id string) error
    List() ([]Item, error)
    Search(query string) ([]Item, error)
}

// Good: small interfaces, compose when needed
type Creator interface { Create(item Item) error }
type Reader interface  { Read(id string) (Item, error) }
type Lister interface  { List() ([]Item, error) }

type ReadWriter interface { Reader; Creator }
```

## Optional Behavior with Type Assertions

```go
type Flusher interface { Flush() error }

func writeAndFlush(w io.Writer, data []byte) error {
    if _, err := w.Write(data); err != nil {
        return err
    }
    if f, ok := w.(Flusher); ok {
        return f.Flush()
    }
    return nil
}
```

## Dependency Injection

```go
type UserService struct {
    repo   UserRepository
    mailer EmailSender
}

func NewUserService(repo UserRepository, mailer EmailSender) *UserService {
    return &UserService{repo: repo, mailer: mailer}
}

// Test: inject mocks
type MockRepo struct {
    GetUserFunc func(ctx context.Context, id string) (*User, error)
}
func (m *MockRepo) GetUser(ctx context.Context, id string) (*User, error) {
    return m.GetUserFunc(ctx, id)
}
```

## Embedding for Composition

```go
type Logger interface { Log(msg string) }
type NoOpLogger struct{}
func (NoOpLogger) Log(msg string) {}

type Service struct {
    Logger  // Embedded: Service gets Log() method
}

func NewService(logger Logger) *Service {
    if logger == nil { logger = NoOpLogger{} }
    return &Service{Logger: logger}
}
```

## Quick Reference

| Pattern | When |
|---------|------|
| 1-2 method interface | Default: always start small |
| Functional options | Configurable constructors with defaults |
| Type assertion | Optional/conditional behavior |
| Consumer-defined interface | Decouple consumer from provider |
| Compile-time check | Ensure type satisfies interface at build time |
| Embedding | Extend behavior via composition, not inheritance |
