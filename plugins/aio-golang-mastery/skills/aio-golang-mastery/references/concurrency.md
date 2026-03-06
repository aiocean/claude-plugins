# Concurrency Patterns

## Channel Rules

- **Buffer size: 0 or 1.** Justify anything larger with a comment.
- **Document goroutine lifetimes.** Every `go func()` must have a clear shutdown path.
- **Prefer synchronous functions.** Let callers add concurrency.

## Worker Pool (Bounded Concurrency)

```go
type WorkerPool struct {
    workers int
    tasks   chan func()
    wg      sync.WaitGroup
}

func NewWorkerPool(workers int) *WorkerPool {
    wp := &WorkerPool{workers: workers, tasks: make(chan func(), workers*2)}
    for i := 0; i < workers; i++ {
        wp.wg.Add(1)
        go func() {
            defer wp.wg.Done()
            for task := range wp.tasks {
                task()
            }
        }()
    }
    return wp
}

func (wp *WorkerPool) Submit(task func()) { wp.tasks <- task }
func (wp *WorkerPool) Shutdown()          { close(wp.tasks); wp.wg.Wait() }
```

## errgroup (Preferred for Most Cases)

```go
import "golang.org/x/sync/errgroup"

func FetchAll(ctx context.Context, urls []string) ([][]byte, error) {
    g, ctx := errgroup.WithContext(ctx)
    results := make([][]byte, len(urls))

    for i, url := range urls {
        g.Go(func() error {
            data, err := fetch(ctx, url)
            if err != nil { return err }
            results[i] = data  // Safe: each goroutine writes to unique index
            return nil
        })
    }
    return results, g.Wait()
}

// With concurrency limit
g.SetLimit(10)  // Max 10 concurrent goroutines
```

## Generator Pattern

```go
func generate(ctx context.Context, values ...int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for _, v := range values {
            select {
            case out <- v:
            case <-ctx.Done():
                return
            }
        }
    }()
    return out
}
```

## Fan-Out / Fan-In

```go
// Fan-out: distribute work to N workers
func fanOut(ctx context.Context, input <-chan int, workers int) []<-chan int {
    channels := make([]<-chan int, workers)
    for i := range workers {
        channels[i] = process(ctx, input)
    }
    return channels
}

// Fan-in: merge N channels into one
func fanIn(ctx context.Context, channels ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup
    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan int) {
            defer wg.Done()
            for v := range c {
                select {
                case out <- v:
                case <-ctx.Done(): return
                }
            }
        }(ch)
    }
    go func() { wg.Wait(); close(out) }()
    return out
}
```

## Pipeline

```go
func Stage[T, U any](in <-chan T, fn func(T) U) <-chan U {
    out := make(chan U)
    go func() {
        defer close(out)
        for v := range in {
            out <- fn(v)
        }
    }()
    return out
}

// Usage: numbers -> doubled -> stringified
numbers := generate(ctx, 1, 2, 3)
doubled := Stage(numbers, func(n int) int { return n * 2 })
strings := Stage(doubled, func(n int) string { return fmt.Sprintf("%d", n) })
```

## Preventing Goroutine Leaks

```go
// Bad: goroutine blocks forever if context cancelled
func leakyFetch(url string) <-chan []byte {
    ch := make(chan []byte)
    go func() {
        data, _ := fetch(url)
        ch <- data  // Blocks forever if no receiver
    }()
    return ch
}

// Good: buffered channel + context check
func safeFetch(ctx context.Context, url string) <-chan []byte {
    ch := make(chan []byte, 1)
    go func() {
        data, err := fetch(url)
        if err != nil { return }
        select {
        case ch <- data:
        case <-ctx.Done():
        }
    }()
    return ch
}
```

## Sync Primitives

```go
// Mutex: protect shared state
type Counter struct {
    mu    sync.Mutex
    count int
}

// RWMutex: read-heavy workloads (multiple readers, exclusive writer)
type Cache struct {
    mu    sync.RWMutex
    items map[string]string
}
func (c *Cache) Get(key string) (string, bool) {
    c.mu.RLock(); defer c.mu.RUnlock()
    v, ok := c.items[key]; return v, ok
}

// sync.Once: one-time init
var once sync.Once
once.Do(func() { /* init */ })

// sync.Pool: frequent allocations of same type
var bufPool = sync.Pool{New: func() any { return new(bytes.Buffer) }}
buf := bufPool.Get().(*bytes.Buffer)
defer func() { buf.Reset(); bufPool.Put(buf) }()

// Typed atomics (Go 1.19+)
var count atomic.Int64
count.Add(1)
```

## Rate Limiting

```go
import "golang.org/x/time/rate"

limiter := rate.NewLimiter(rate.Limit(100), 100)  // 100 req/s, burst 100

func handle(ctx context.Context) error {
    if err := limiter.Wait(ctx); err != nil {
        return err
    }
    // process...
}
```

## Semaphore (Bounded Concurrency without Worker Pool)

```go
sem := make(chan struct{}, maxConcurrency)

for _, item := range items {
    sem <- struct{}{}  // Acquire
    go func(item Item) {
        defer func() { <-sem }()  // Release
        process(item)
    }(item)
}
```

## Context Best Practices

- **First parameter**, always: `func Do(ctx context.Context, ...)`
- **Never store in struct fields** — pass explicitly
- **Propagate to all blocking calls** — HTTP, DB, RPC
- **Set deadlines** for external calls: `context.WithTimeout(ctx, 5*time.Second)`
- **Check cancellation** in long loops: `select { case <-ctx.Done(): return ctx.Err() ... }`

## Quick Reference

| Pattern | Use Case |
|---------|----------|
| Worker Pool | Fixed N workers processing a job queue |
| errgroup | N goroutines, fail-fast on first error |
| Fan-out/Fan-in | Distribute work, merge results |
| Pipeline | Chain transformations on a stream |
| Rate Limiter | Control request rate to external service |
| Semaphore | Cap concurrent operations |
| sync.Pool | Reduce GC pressure for frequent allocs |
