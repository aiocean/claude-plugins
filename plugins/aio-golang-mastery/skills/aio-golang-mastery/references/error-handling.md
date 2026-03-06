# Error Handling

## Return Errors, Never Panic

```go
// Wrong
func run(args []string) {
    if len(args) == 0 { panic("an argument is required") }
}

// Correct
func run(args []string) error {
    if len(args) == 0 {
        return errors.New("an argument is required")
    }
    return nil
}
```

## Error Wrapping

```go
// Use %w for errors callers might need to inspect
func LoadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("load config %s: %w", path, err)
    }
    var cfg Config
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, fmt.Errorf("parse config %s: %w", path, err)
    }
    return &cfg, nil
}

// Use %v when error is internal implementation detail
fmt.Errorf("connect: %v", err)  // Callers should NOT match on this
```

## Error String Conventions

- **No capitalization** — `fmt.Errorf("something failed")` not `"Something failed"`
- **No punctuation** — `"open file"` not `"open file."`
- Format: `"noun context: %w"` — `"load config /etc/app.conf: %w"`

## Handle Errors Once

```go
// Wrong: log AND return (caller might log again)
if err != nil {
    log.Printf("failed: %v", err)
    return err
}

// Correct: return with context, let caller decide
if err != nil {
    return fmt.Errorf("fetch user %s: %w", id, err)
}

// OR log and handle (don't propagate)
if err != nil {
    log.Printf("non-critical: %v", err)
    return defaultValue, nil
}
```

## Custom Error Types

```go
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation: %s: %s", e.Field, e.Message)
}

// Sentinel errors
var (
    ErrNotFound     = errors.New("not found")
    ErrUnauthorized = errors.New("unauthorized")
)
```

## Error Type Decision Table

| Scenario | Use |
|----------|-----|
| Caller matches specific error | Sentinel: `var ErrNotFound = errors.New(...)` |
| Caller needs error details | Custom type: `type ValidationError struct{...}` |
| Just adding context | `fmt.Errorf("context: %w", err)` |
| Multiple errors at once | `errors.Join(err1, err2)` (Go 1.20+) |
| Internal, callers won't match | `fmt.Errorf("context: %v", err)` |

## Checking Errors

```go
// Check sentinel
if errors.Is(err, sql.ErrNoRows) {
    return nil, ErrNotFound
}

// Check type
var validErr *ValidationError
if errors.As(err, &validErr) {
    log.Printf("field %s: %s", validErr.Field, validErr.Message)
}

// Never compare errors with ==, always use errors.Is/errors.As
```

## Indent Error Flow

```go
// Good: error handling is indented, happy path is flush left
val, err := doSomething()
if err != nil {
    return err
}
// continue with val...

// Bad: happy path is indented
val, err := doSomething()
if err == nil {
    // continue...
} else {
    return err
}
```
