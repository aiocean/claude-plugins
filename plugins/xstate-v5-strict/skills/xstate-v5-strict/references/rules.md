# XState v5 Enforcement Rules

## Table of Contents

1. [Machine Creation](#1-machine-creation)
2. [Type Safety](#2-type-safety)
3. [Implementation Placement](#3-implementation-placement)
4. [Parameter Typing](#4-parameter-typing)
5. [Event Handling](#5-event-handling)
6. [Forbidden v4 Patterns](#6-forbidden-v4-patterns)
7. [Modern v5 Equivalents](#7-modern-v5-equivalents)
8. [Context Rules](#8-context-rules)
9. [Invoke Configuration](#9-invoke-configuration)
10. [Actor Spawning](#10-actor-spawning)
11. [Type Helpers](#11-type-helpers)
12. [Anti-God-Machine](#12-anti-god-machine)
13. [Testing](#13-testing)
14. [React Integration](#14-react-integration)
15. [Agent Enforcement](#15-agent-enforcement)

## 1. Machine Creation

Always use `setup({...}).createMachine({...})`:

```ts
// CORRECT
const machine = setup({
  types: { context: {} as Ctx, events: {} as Ev },
  actions: { /* ... */ },
  guards: { /* ... */ },
  actors: { /* ... */ },
}).createMachine({ /* config */ })

// WRONG — disallowed by this ruleset
import { createMachine } from "xstate"
const machine = createMachine({ /* ... */ }, { actions: { /* ... */ } })
```

## 2. Type Safety

- Require TypeScript 5.0+ with `strictNullChecks: true`
- Favor type inference over explicit generics
- Zod schemas optional (use when codebase already uses Zod):

```ts
const ContextSchema = z.object({ count: z.number() })
type Context = z.infer<typeof ContextSchema>
```

## 3. Implementation Placement

ALL actions, guards, actors in `setup()`, NOT in `types`:

```ts
// CORRECT
setup({
  types: { context: {} as { count: number } },
  actions: { increment: assign({ count: ({ context }) => context.count + 1 }) },
  guards: { isPositive: ({ context }) => context.count > 0 },
})

// WRONG — implementation in types
setup({ types: { actions: { increment: () => {} } } })
```

## 4. Parameter Typing

Actions/guards use typed second argument:

```ts
actions: {
  sendMessage: (_, params: { message: string; recipient: string }) => {
    console.log(`To ${params.recipient}: ${params.message}`)
  },
}
// Usage in machine config:
entry: {
  type: "sendMessage",
  params: ({ context, event }) => ({ message: context.message, recipient: event.recipient }),
}
```

## 5. Event Handling

Prefer **params** over assertEvent. Use assertEvent only when narrowing is truly needed:

```ts
// PREFERRED: params
actions: {
  handleUpdate: (_, params: { name: string }) => { console.log(params.name) },
}
on: {
  update: { actions: { type: "handleUpdate", params: ({ event }) => ({ name: event.name }) } },
}

// ACCEPTABLE: assertEvent when narrowing needed
actions: {
  handleUpdate: ({ event }) => {
    assertEvent(event, "updateUser")
    console.log(event.name)
  },
}
```

**Never send string events:**
```ts
actor.send({ type: "someEvent" })  // CORRECT
actor.send("someEvent")            // WRONG
```

## 6. Forbidden v4 Patterns

```ts
// ALL FORBIDDEN:
import { Machine, interpret, spawn, send, pure, choose } from "xstate"
Machine({ /* ... */ })
interpret(machine)
spawn(logic)
send({ type: "event" })
pure(() => [])
choose([{ guard: "g", actions: ["a"] }])
on: { event: { cond: "someGuard" } }   // use "guard" not "cond"
machine.withContext({ count: 0 })        // use input
machine.withConfig({ actions: {} })      // use provide()
invoke: { src: "actor", autoForward: true }
state.meta    // use state.getMeta()
state.configuration  // use state._nodes
```

## 7. Modern v5 Equivalents

```ts
import { setup, createActor, spawnChild, stopChild, enqueueActions, raise, sendTo } from "xstate"

setup({ /* ... */ }).createMachine({ /* ... */ })
createActor(machine).start()
spawnChild("someLogic", { id: "child" })
stopChild("child")
raise({ type: "event" })
sendTo("someActor", { type: "event" })
enqueueActions(({ enqueue, check }) => {
  if (check("someGuard")) enqueue("someAction")
})
on: { event: { guard: "someGuard" } }
context: ({ input }) => ({ count: input.initialCount || 0 })
machine.provide({ actions: { /* ... */ } })
```

## 8. Context Rules

**Initialization** — use `input` for instance-specific, static object for stable defaults:

```ts
// Instance-specific
context: ({ input }) => ({ count: input.initialCount || 0, user: { name: input.userName || "Guest" } })

// Static defaults
context: { count: 0 }
```

**Updates** — always use `assign` with typing:

```ts
actions: {
  increment: assign({ count: ({ context }) => context.count + 1 }),
  updateByAmount: assign({
    count: ({ context }, params: { amount: number }) => context.count + params.amount,
  }),
}
```

## 9. Invoke Configuration

```ts
actors: {
  fetchUser: fromPromise(async ({ input }: { input: { userId: string } }) => {
    const res = await fetch(`/api/users/${input.userId}`)
    return res.json()
  }),
},
// In state:
invoke: {
  src: "fetchUser",
  input: ({ context }) => ({ userId: context.userId }),
  onDone: { target: "success", actions: assign({ user: ({ event }) => event.output }) },
  onError: { target: "error", actions: assign({ error: ({ event }) => event.error }) },
}
```

## 10. Actor Spawning

```ts
actors: {
  timerLogic: fromCallback(({ sendBack }) => {
    const id = setInterval(() => sendBack({ type: "tick" }), 1000)
    return () => clearInterval(id)  // ALWAYS return cleanup
  }),
},
actions: {
  startTimer: spawnChild("timerLogic", { id: "timer" }),
  stopTimer: stopChild("timer"),
}
```

## 11. Type Helpers

```ts
import { type ActorRefFrom, type SnapshotFrom, type EventFromLogic, type InputFrom, type OutputFrom } from "xstate"

type TimerRef = ActorRefFrom<typeof timerLogic>
type MachineSnap = SnapshotFrom<typeof someMachine>
type MachineEvt = EventFromLogic<typeof someMachine>
```

## 12. Anti-God-Machine

**Hard rule**: concerns with different lifecycles, owners, or failure modes MUST be separate actors.

Anti-patterns:
- Single machine owning auth + toasts + feature workflows + transport/retry
- Context booleans (`isLoading`, `isAuthenticated`) duplicating state nodes

Recommended:
- `auth/session` actor + `notifications` actor + `feature` actor(s) + thin `app-shell` orchestrator
- Top-level parallel regions only for tightly coupled app-shell concerns
- Route events explicitly with `sendTo`

## 13. Testing

### Deterministic Actor Tests

```ts
import { createActor, waitFor } from "xstate"

test("increments", () => {
  const actor = createActor(counterMachine, { input: { initialCount: 0 } }).start()
  actor.send({ type: "inc" })
  expect(actor.getSnapshot().context.count).toBe(1)
  actor.stop()
})

test("async reaches success", async () => {
  const actor = createActor(fetchMachine).start()
  actor.send({ type: "submit" })
  const snap = await waitFor(actor, (s) => s.matches("success"))
  expect(snap.matches("success")).toBe(true)
  actor.stop()
})
```

### Model-Based Testing

```ts
import { createTestModel } from "xstate/graph"

const model = createTestModel(toggleMachine)
for (const path of model.getShortestPaths()) {
  it(`reaches ${JSON.stringify(path.state.value)}`, async () => {
    await path.test({
      events: { TOGGLE: async () => { /* execute in SUT */ } },
      states: { inactive: async () => { /* assert */ }, active: async () => { /* assert */ } },
    })
  })
}
```

### Graph Utilities

- `getShortestPaths(logic, options?)` — minimal state coverage
- `getSimplePaths(logic, options?)` — exhaustive transition coverage
- `getAdjacencyMap(logic, options?)` — visualization/debugging
- Always bound traversal with `stopWhen`/`limit` for dynamic context

## 14. React Integration

### createActorContext (shared state)

```ts
import { createActorContext, shallowEqual } from "@xstate/react"
import { type SnapshotFrom } from "xstate"

const ExampleCtx = createActorContext(exampleMachine)
export const ExampleProvider = ExampleCtx.Provider
export const useExampleSelector = ExampleCtx.useSelector
export const useExampleActorRef = ExampleCtx.useActorRef

const selectCount = (s: SnapshotFrom<typeof exampleMachine>) => s.context.count
export const useCount = () => useExampleSelector(selectCount)

// shallowEqual for object selectors
const selectCtx = (s: SnapshotFrom<typeof exampleMachine>) => s.context
export const useExampleContext = () => useExampleSelector(selectCtx, shallowEqual)
```

Rules:
- Create machine + `createActorContext(...)` at module scope (not inside components)
- Wrap smallest subtree that needs shared state
- `.useSelector(...)` for reads, `.useActorRef()` for sends
- Selectors defined outside components, use `shallowEqual` for objects

### useMachine (component-local)

```ts
const [snapshot, send] = useMachine(machine)
snapshot.matches("loading")
snapshot.context.data
send({ type: "FETCH" })
```

### useSelector (optimized reads)

```ts
const userName = useSelector(actorRef, (s) => s.context.user?.name)
const isLoading = useSelector(actorRef, (s) => s.matches("loading"))
```

## 15. Agent Enforcement

AI agents MUST:
1. Use `setup().createMachine()` for all machines
2. Put ALL implementations in setup
3. Prefer typed params; use assertEvent only when narrowing needed
4. Proper TypeScript types for all parameters
5. Avoid ALL v4 patterns (section 6)
6. Provide boundary/decomposition justification for orchestration roots
7. Always handle `onError` for invokes
8. No state-mirroring context booleans without documented rationale
9. No unrelated-domain aggregation without explicit exception

When docs are ambiguous:
1. Confirm against XState v5 source code
2. Check GitHub issues/discussions
3. Write a minimal type-test rather than guessing
