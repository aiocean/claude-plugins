---
name: aio-xstate
description: Implement XState v5 state machines with strict patterns — setup().createMachine(), actors, and TypeScript typing. Triggers: "create state machine", "implement XState", "design statechart", "add actor", XState, statecharts, fromPromise.
---

## Environment
- tsc: !`tsc --version 2>/dev/null || echo "NOT INSTALLED"`

# XState v5 Strict Skill

> **XState v5 ONLY.** Requires TypeScript 5.0+. Never use v4 patterns.

## Workflow

1. **Design first** (unless user says skip): produce planning artifacts before code
2. **Types first**: `types.context`, `types.events`, `types.input` (+ `types.output`)
3. **Implement**: `setup({...}).createMachine({...})` with all implementations in setup
4. **Validate**: `tsc --noEmit`, no `any` leaks, no string events, no v4 imports

## Quick Reference

```ts
import { setup, assign, fromPromise, createActor } from "xstate"

const machine = setup({
  types: {
    context: {} as { count: number },
    events: {} as { type: "inc" } | { type: "add"; amount: number },
    input: {} as { initialCount?: number },
  },
  actions: {
    inc: assign({ count: ({ context }) => context.count + 1 }),
    add: assign({
      count: ({ context }, params: { amount: number }) => context.count + params.amount,
    }),
  },
  guards: {
    isPositive: ({ context }) => context.count > 0,
  },
}).createMachine({
  id: "counter",
  context: ({ input }) => ({ count: input.initialCount ?? 0 }),
  initial: "active",
  states: {
    active: {
      on: {
        inc: { actions: "inc" },
        add: {
          actions: {
            type: "add",
            params: ({ event }) => ({ amount: event.amount }),
          },
        },
      },
    },
  },
})

const actor = createActor(machine, { input: { initialCount: 0 } })
actor.subscribe((snapshot) => console.log(snapshot.context.count))
actor.start()
actor.send({ type: "inc" })
```

## Hard Rules

1. **`setup({...}).createMachine({...})`** for all machines
2. **All implementations in `setup()`**: actions, guards, actors
3. **Typed params**: actions/guards take `(_, params: { ... })` second arg
4. **Event objects only**: `actor.send({ type: "X" })`, never strings
5. **No god-machine**: unrelated domains = separate actors/machines
6. **No state-mirroring booleans**: use state nodes for modes, context for data
7. **`invoke` has `onError`**: always handle failure
8. **No v4 patterns**: no `interpret`, `Machine`, `cond`, `send`, `pure`, `choose`

## v4 to v5 Migration

| v4 (WRONG) | v5 (CORRECT) |
|---|---|
| `createMachine()` alone | `setup().createMachine()` |
| `interpret()` | `createActor()` |
| `services: {}` | `actors: {}` |
| `cond` | `guard` |
| `send()` action | `raise()` or `sendTo()` |
| `pure()`/`choose()` | `enqueueActions()` |
| `withContext()` | `input` |
| `withConfig()` | `provide()` |
| `spawn` import | `spawnChild` or `({ spawn })` args |

## Actor Types

| Type | Creator | Use Case |
|---|---|---|
| State Machine | `setup().createMachine()` | Complex state logic |
| Promise | `fromPromise()` | Async request/response |
| Callback | `fromCallback()` | Bidirectional streams, SDK bridging |
| Observable | `fromObservable()` | RxJS streams |
| Transition | `fromTransition()` | Reducer-like state |

## invoke vs spawnChild

- **invoke**: actor lifecycle tied to state. Created on entry, stopped on exit. Use for request/response
- **spawnChild**: dynamic actors independent of state. Use for long-lived collaborators with `sendTo`

## Planning Artifacts (Design-First)

Before writing machine code, produce:

1. **Goal**: one sentence
2. **Non-goals**: what the machine does NOT handle
3. **State inventory**: name, meaning, invariants per state
4. **Event catalog**: name, payload, source (UI/network/timer/child)
5. **Transition table**: `from -> on event -> guard? -> actions -> to`
6. **Async/actor map**: invoke vs spawnChild, onDone/onError, cancellation
7. **Error strategy**: state vs context, retry policy, fatal vs recoverable

## Detailed References

- **[rules.md](references/rules.md)** — Complete enforcement rules, forbidden patterns, testing, React integration
- **[patterns.md](references/patterns.md)** — Actor patterns: fromCallback, fromPromise, hierarchy, parallel, delays, cleanup, SDK bridging, Promise-bridge
