# Generics (Go 1.18+)

## When to Use Generics

- Collection operations (Filter, Map, Reduce, Contains)
- Generic data structures (Stack, Queue, Set)
- Type-safe results/options
- Channel utilities (Merge, Stage)

**When NOT to use:** Don't over-generalize. If you have one concrete type, just use it.

## Basic Type Parameters

```go
func Max[T cmp.Ordered](a, b T) T {
    if a > b { return a }
    return b
}

func Map[T, U any](slice []T, fn func(T) U) []U {
    result := make([]U, len(slice))
    for i, v := range slice { result[i] = fn(v) }
    return result
}

// Type inference works — no need to specify type args
maxInt := Max(10, 20)
doubled := Map([]int{1, 2, 3}, func(n int) int { return n * 2 })
```

## Constraints

```go
// Built-in
func Sum[T cmp.Ordered](numbers []T) T { ... }  // Supports <, >, ==

// Custom union
type Number interface { ~int | ~int64 | ~float64 }
func Sum[T Number](numbers []T) T { ... }

// ~ approximate: includes type aliases
type MyInt int
Double[MyInt](5)  // Works because of ~int

// Method constraint
type Stringer interface { String() string }
func PrintAll[T Stringer](items []T) { ... }
```

## Generic Data Structures

```go
type Stack[T any] struct{ items []T }

func (s *Stack[T]) Push(item T)        { s.items = append(s.items, item) }
func (s *Stack[T]) Pop() (T, bool) {
    if len(s.items) == 0 { var zero T; return zero, false }
    item := s.items[len(s.items)-1]
    s.items = s.items[:len(s.items)-1]
    return item, true
}

type Set[T comparable] struct{ m map[T]struct{} }

func NewSet[T comparable]() *Set[T]           { return &Set[T]{m: make(map[T]struct{})} }
func (s *Set[T]) Add(item T)                  { s.m[item] = struct{}{} }
func (s *Set[T]) Has(item T) bool             { _, ok := s.m[item]; return ok }
```

## Collection Operations

```go
func Filter[T any](slice []T, pred func(T) bool) []T {
    result := make([]T, 0, len(slice))
    for _, v := range slice {
        if pred(v) { result = append(result, v) }
    }
    return result
}

func Reduce[T, U any](slice []T, initial U, fn func(U, T) U) U {
    acc := initial
    for _, v := range slice { acc = fn(acc, v) }
    return acc
}

func Contains[T comparable](slice []T, target T) bool {
    for _, v := range slice {
        if v == target { return true }
    }
    return false
}

func Unique[T comparable](slice []T) []T {
    seen := make(map[T]struct{})
    result := make([]T, 0, len(slice))
    for _, v := range slice {
        if _, exists := seen[v]; !exists {
            seen[v] = struct{}{}
            result = append(result, v)
        }
    }
    return result
}
```

## Result Type (Rust-inspired)

```go
type Result[T any] struct {
    value T
    err   error
}

func Ok[T any](value T) Result[T]    { return Result[T]{value: value} }
func Err[T any](err error) Result[T] { return Result[T]{err: err} }
func (r Result[T]) IsOk() bool       { return r.err == nil }
func (r Result[T]) Unwrap() (T, error) { return r.value, r.err }
func (r Result[T]) UnwrapOr(def T) T {
    if r.err != nil { return def }
    return r.value
}
```

## Generic Channel Operations

```go
func Merge[T any](channels ...<-chan T) <-chan T {
    out := make(chan T)
    var wg sync.WaitGroup
    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan T) {
            defer wg.Done()
            for v := range c { out <- v }
        }(ch)
    }
    go func() { wg.Wait(); close(out) }()
    return out
}

func Stage[T, U any](in <-chan T, fn func(T) U) <-chan U {
    out := make(chan U)
    go func() {
        defer close(out)
        for v := range in { out <- fn(v) }
    }()
    return out
}
```

## Iterators (Go 1.23+)

```go
// Range-over-func
func All[K, V any](m map[K]V) iter.Seq2[K, V] {
    return func(yield func(K, V) bool) {
        for k, v := range m {
            if !yield(k, v) { return }
        }
    }
}

// Usage
for k, v := range All(myMap) {
    fmt.Println(k, v)
}
```

## Quick Reference

| Feature | Syntax |
|---------|--------|
| Basic | `func F[T any]()` |
| Ordered | `func F[T cmp.Ordered]()` |
| Comparable | `func F[T comparable]()` |
| Multi-param | `func F[T, U any]()` |
| Union | `interface{ int \| string }` |
| Approximate | `~int` (includes type aliases) |
| Generic type | `type Stack[T any] struct{}` |
| Generic interface | `type Container[T any] interface{}` |
