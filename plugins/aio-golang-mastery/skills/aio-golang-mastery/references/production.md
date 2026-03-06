# Production Patterns

## Graceful Shutdown

```go
func main() {
    srv := &http.Server{Addr: ":8080", Handler: mux}

    go func() {
        if err := srv.ListenAndServe(); err != http.ErrServerClosed {
            slog.Error("server error", "err", err)
        }
    }()

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        slog.Error("forced shutdown", "err", err)
    }
    slog.Info("server stopped")
}
```

## Structured Logging (slog, Go 1.21+)

```go
// Setup
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo,
}))
slog.SetDefault(logger)

// Usage
slog.Info("request", "method", r.Method, "path", r.URL.Path, "status", status, "duration", duration)
slog.Error("db query failed", "err", err, "query", query)

// With context (request-scoped fields)
logger := slog.With("request_id", reqID, "user_id", userID)
logger.Info("processing order", "order_id", orderID)
```

## Middleware Pattern

```go
type Middleware func(http.Handler) http.Handler

func Logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        slog.Info("request", "method", r.Method, "path", r.URL.Path, "duration", time.Since(start))
    })
}

func Auth(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        token := r.Header.Get("Authorization")
        if token == "" {
            http.Error(w, "unauthorized", http.StatusUnauthorized)
            return
        }
        // validate token, add user to context...
        next.ServeHTTP(w, r)
    })
}

// Chain
handler := Logging(Auth(mux))
```

## Health Check

```go
func HealthHandler(w http.ResponseWriter, r *http.Request) {
    checks := map[string]string{
        "status": "ok",
        "db":     "ok",
    }
    if err := db.Ping(); err != nil {
        checks["db"] = "unhealthy"
        w.WriteHeader(http.StatusServiceUnavailable)
    }
    json.NewEncoder(w).Encode(checks)
}
```

## Rate Limiting (Per-IP)

```go
import "golang.org/x/time/rate"

type IPRateLimiter struct {
    mu       sync.Mutex
    limiters map[string]*rate.Limiter
    rps      int
    burst    int
}

func (rl *IPRateLimiter) GetLimiter(ip string) *rate.Limiter {
    rl.mu.Lock()
    defer rl.mu.Unlock()
    l, exists := rl.limiters[ip]
    if !exists {
        l = rate.NewLimiter(rate.Limit(rl.rps), rl.burst)
        rl.limiters[ip] = l
    }
    return l
}

func RateLimit(limiter *IPRateLimiter) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if !limiter.GetLimiter(r.RemoteAddr).Allow() {
                http.Error(w, "too many requests", http.StatusTooManyRequests)
                return
            }
            next.ServeHTTP(w, r)
        })
    }
}
```

## Panic Recovery

```go
func Recovery(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                slog.Error("panic recovered", "err", err, "stack", string(debug.Stack()))
                http.Error(w, "internal server error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}
```

## Database Connection Pool

```go
db, err := sql.Open("postgres", connStr)
if err != nil { return err }

db.SetMaxOpenConns(25)
db.SetMaxIdleConns(5)
db.SetConnMaxLifetime(5 * time.Minute)
db.SetConnMaxIdleTime(1 * time.Minute)

// Always use context
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
defer cancel()
row := db.QueryRowContext(ctx, "SELECT ...")
```

## Circuit Breaker

```go
type CircuitBreaker struct {
    mu          sync.Mutex
    failures    int
    maxFailures int
    state       string  // "closed", "open", "half-open"
    lastFailure time.Time
    cooldown    time.Duration
}

func (cb *CircuitBreaker) Execute(fn func() error) error {
    cb.mu.Lock()
    if cb.state == "open" {
        if time.Since(cb.lastFailure) > cb.cooldown {
            cb.state = "half-open"
        } else {
            cb.mu.Unlock()
            return errors.New("circuit breaker open")
        }
    }
    cb.mu.Unlock()

    err := fn()

    cb.mu.Lock()
    defer cb.mu.Unlock()
    if err != nil {
        cb.failures++
        cb.lastFailure = time.Now()
        if cb.failures >= cb.maxFailures {
            cb.state = "open"
        }
        return err
    }
    cb.failures = 0
    cb.state = "closed"
    return nil
}
```

## Production Checklist

- [ ] Graceful shutdown with signal handling
- [ ] Structured logging (slog JSON)
- [ ] Health check endpoint (`/health` or `/healthz`)
- [ ] Panic recovery middleware
- [ ] Request timeouts (read, write, idle)
- [ ] Database connection pool limits
- [ ] Rate limiting for public endpoints
- [ ] CORS configuration if serving web clients
- [ ] Metrics endpoint (Prometheus `/metrics`)
- [ ] Context propagation through all layers
- [ ] Error wrapping with context at each layer
- [ ] Race detector clean (`go test -race ./...`)
