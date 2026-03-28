# aio-react-minimal-effects

Minimize useEffect in React 19. Scan mode finds and fixes problematic effects in existing code. Covers React Compiler, new hooks, and proper patterns.

## Install

```bash
/plugin install aio-react-minimal-effects@aiocean-plugins
```

## What It Does

- Scan mode: audit existing code and surface problematic useEffect usage
- Fix anti-patterns: replace effects with proper React 19 equivalents
- Reference guide for React 19 patterns and hooks

## Patterns Covered

- `useActionState` and `useOptimistic` replacing effect-driven state
- Ref as prop (React 19 forwardRef removal)
- React Compiler compatibility rules
- When effects are and are not appropriate
