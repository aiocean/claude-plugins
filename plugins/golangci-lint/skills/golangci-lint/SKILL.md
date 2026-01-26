---
name: golangci-lint
description: Run golangci-lint efficiently on Go projects. Lint only changed code, fix v2 config issues, handle common warnings. Use when linting Go code, seeing golangci-lint errors, or user asks to "lint changed code", "lint PR", "fix lint errors".
---

# golangci-lint

Efficient Go linting with golangci-lint.

## Lint Changed Code Only

```bash
# Lint unstaged changes (or HEAD~ if no unstaged)
golangci-lint run --new ./...

# Lint from specific revision
golangci-lint run --new-from-rev=HEAD~5 ./...

# Lint from merge-base (ideal for PRs)
golangci-lint run --new-from-merge-base=main ./...

# Lint entire changed files (not just changed lines)
golangci-lint run --new-from-rev=HEAD~5 --whole-files ./...
```

## golangci-lint v2 Config Migration

Config format changed in v2. Common errors and fixes:

| Error | Fix |
|-------|-----|
| `unsupported version of the configuration` | Add `version: "2"` at top |
| `typecheck is not a linter` | Remove `typecheck` from enabled linters |
| `unknown linters: 'gosimple'` | Remove `gosimple` (now part of `staticcheck`) |

**Minimal v2 config** (`.golangci.yml`):

```yaml
version: "2"

run:
  timeout: 10m

linters:
  disable-all: true
  enable:
    - bodyclose
    - errcheck
    - govet
    - staticcheck
    - unused
    - ineffassign
    - gosec
    - unconvert
    - dupl
    - goconst
```

## Common Suppressions

### Ignore return value (errcheck)

```go
// Single line
defer tp.Shutdown(ctx) //nolint:errcheck // reason

// Function scope
//nolint:errcheck
func cleanup() { ... }
```

### Integer overflow (gosec G115)

```go
// Safe conversion (value won't overflow)
otelutil.SetShopAttributes(ctx, int64(shop.Id), domain) //nolint:gosec // IDs won't overflow int64
```

### Deprecated package (staticcheck SA1019)

```go
//nolint:staticcheck // using deprecated for compatibility
import "io/ioutil"
```

## Lint Specific Packages

```bash
# Single package
golangci-lint run ./internal/otel/...

# Multiple packages
golangci-lint run ./internal/otel/... ./internal/invoke/...

# Filter output for specific issues
golangci-lint run ./... 2>&1 | grep -E "(otel|SetShop)"
```

## Quick Reference

| Flag | Purpose |
|------|---------|
| `--new` | Only new issues (unstaged or HEAD~) |
| `--new-from-rev=REV` | Only issues after git revision |
| `--new-from-merge-base=BRANCH` | Only issues after merge-base |
| `--whole-files` | Check entire changed files |
| `--fix` | Auto-fix issues where possible |
| `--fast` | Run only fast linters |

## Workflow: PR Linting

```bash
# 1. Check what branch you're comparing against
git log --oneline -5

# 2. Lint only PR changes
golangci-lint run --new-from-merge-base=main ./...

# 3. If issues, fix and verify
# ... make fixes ...
golangci-lint run --new ./...  # verify fixes
```

## Workflow: Pre-commit

```bash
# Lint staged changes before commit
golangci-lint run --new ./...
```
