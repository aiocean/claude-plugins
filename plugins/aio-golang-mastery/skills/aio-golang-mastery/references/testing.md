# Testing

## TDD Workflow

```
RED     -> Write a failing test first
GREEN   -> Write minimal code to pass
REFACTOR -> Improve code, keep tests green
REPEAT
```

## Table-Driven Tests (Standard Pattern)

```go
func TestParseConfig(t *testing.T) {
    tests := []struct {
        name    string
        input   string
        want    *Config
        wantErr bool
    }{
        {name: "valid", input: `{"host":"localhost"}`, want: &Config{Host: "localhost"}},
        {name: "invalid JSON", input: `{invalid}`, wantErr: true},
        {name: "empty", input: "", wantErr: true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ParseConfig(tt.input)
            if tt.wantErr {
                if err == nil { t.Error("expected error, got nil") }
                return
            }
            if err != nil { t.Fatalf("unexpected error: %v", err) }
            if !reflect.DeepEqual(got, tt.want) {
                t.Errorf("got %+v; want %+v", got, tt.want)
            }
        })
    }
}
```

## Parallel Subtests

```go
for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        t.Parallel()  // Run subtests concurrently
        result := Process(tt.input)
        // assertions...
    })
}
```

## Test Helpers

```go
func setupTestDB(t *testing.T) *sql.DB {
    t.Helper()  // Error reports point to caller, not this helper
    db, err := sql.Open("sqlite3", ":memory:")
    if err != nil { t.Fatalf("open db: %v", err) }
    t.Cleanup(func() { db.Close() })  // Auto-cleanup
    return db
}

func assertEqual[T comparable](t *testing.T, got, want T) {
    t.Helper()
    if got != want { t.Errorf("got %v; want %v", got, want) }
}

// Temp directory (auto-cleaned)
tmpDir := t.TempDir()
```

## Interface-Based Mocking

```go
type UserRepository interface {
    GetUser(id string) (*User, error)
}

// Mock with function fields (flexible per-test behavior)
type MockUserRepo struct {
    GetUserFunc func(id string) (*User, error)
}

func (m *MockUserRepo) GetUser(id string) (*User, error) {
    return m.GetUserFunc(id)
}

func TestService(t *testing.T) {
    mock := &MockUserRepo{
        GetUserFunc: func(id string) (*User, error) {
            if id == "123" { return &User{ID: "123", Name: "Alice"}, nil }
            return nil, ErrNotFound
        },
    }
    svc := NewService(mock)
    // test...
}
```

## Golden File Testing

```go
var update = flag.Bool("update", false, "update golden files")

func TestRender(t *testing.T) {
    got := Render(input)
    golden := filepath.Join("testdata", name+".golden")

    if *update {
        os.WriteFile(golden, got, 0644)
    }
    want, _ := os.ReadFile(golden)
    if !bytes.Equal(got, want) {
        t.Errorf("mismatch:\ngot:\n%s\nwant:\n%s", got, want)
    }
}
// Update: go test -update
```

## HTTP Handler Testing

```go
func TestHealthHandler(t *testing.T) {
    req := httptest.NewRequest(http.MethodGet, "/health", nil)
    w := httptest.NewRecorder()

    HealthHandler(w, req)

    resp := w.Result()
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        t.Errorf("status %d; want %d", resp.StatusCode, http.StatusOK)
    }
    body, _ := io.ReadAll(resp.Body)
    if string(body) != "OK" {
        t.Errorf("body %q; want %q", body, "OK")
    }
}
```

## Benchmarks

```go
func BenchmarkProcess(b *testing.B) {
    data := generateTestData(1000)
    b.ResetTimer()  // Exclude setup
    for i := 0; i < b.N; i++ {
        Process(data)
    }
}

// With sizes
func BenchmarkSort(b *testing.B) {
    for _, size := range []int{100, 1000, 10000} {
        b.Run(fmt.Sprintf("n=%d", size), func(b *testing.B) {
            data := generateSlice(size)
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                tmp := slices.Clone(data)
                slices.Sort(tmp)
            }
        })
    }
}

// Run: go test -bench=. -benchmem
```

## Fuzzing (Go 1.18+)

```go
func FuzzParseJSON(f *testing.F) {
    f.Add(`{"name":"test"}`)
    f.Add(`[]`)
    f.Add(`""`)

    f.Fuzz(func(t *testing.T, input string) {
        var result map[string]any
        err := json.Unmarshal([]byte(input), &result)
        if err != nil { return }  // Invalid input is expected

        // Property: if parse succeeds, re-encode must also succeed
        _, err = json.Marshal(result)
        if err != nil { t.Errorf("Marshal after Unmarshal: %v", err) }
    })
}
// Run: go test -fuzz=FuzzParseJSON -fuzztime=30s
```

## Coverage Targets

| Code Type | Target |
|-----------|--------|
| Critical business logic | 100% |
| Public APIs | 90%+ |
| General code | 80%+ |
| Generated code | Exclude |

## Commands

```bash
go test ./...                          # All tests
go test -v -run TestAdd ./...          # Specific test
go test -race ./...                    # Race detection
go test -cover -coverprofile=c.out ./... # Coverage
go tool cover -html=c.out             # Coverage in browser
go test -bench=. -benchmem ./...       # Benchmarks
go test -fuzz=FuzzParse -fuzztime=30s  # Fuzzing
go test -count=10 ./...                # Flaky test detection
go test -short ./...                   # Skip long tests
```

## Best Practices

**DO:** Write tests FIRST (TDD). Test behavior, not implementation. Use `t.Helper()` in helpers. Use `t.Parallel()` for independent tests. Use meaningful test names.

**DON'T:** Test private functions directly. Use `time.Sleep()` in tests (use channels). Ignore flaky tests. Mock everything (prefer integration tests when feasible). Skip error path testing.
