# XState v5 Patterns

## Table of Contents

1. [fromPromise — Async Request/Response](#1-frompromise)
2. [fromCallback — Bidirectional Streams & SDK Bridging](#2-fromcallback)
3. [Hierarchical (Nested) States](#3-hierarchical-states)
4. [Parallel States](#4-parallel-states)
5. [Delayed Transitions](#5-delayed-transitions)
6. [Cleanup Pattern](#6-cleanup-pattern)
7. [enqueueActions — Conditional Logic](#7-enqueueactions)
8. [Spawning Child Actors](#8-spawning-child-actors)
9. [Promise-Bridge Pattern](#9-promise-bridge-pattern)
10. [Parent-Child States for Actor Persistence](#10-parent-child-states)
11. [Snapshot Subscription Pattern](#11-snapshot-subscription)

## 1. fromPromise

Request/response async operations with cancellation support:

```ts
import { fromPromise } from "xstate"

const machine = setup({
  actors: {
    fetchData: fromPromise(async ({ input, signal }: { input: { url: string }; signal: AbortSignal }) => {
      const res = await fetch(input.url, { signal })
      if (!res.ok) throw new Error("Failed")
      return res.json()
    }),
  },
}).createMachine({
  states: {
    loading: {
      invoke: {
        src: "fetchData",
        input: ({ context }) => ({ url: `/api/${context.id}` }),
        onDone: { target: "success", actions: assign({ data: ({ event }) => event.output }) },
        onError: { target: "error", actions: assign({ error: ({ event }) => event.error }) },
      },
      on: { CANCEL: "idle" },  // leaving state cancels the promise via AbortSignal
    },
  },
})
```

## 2. fromCallback

Bidirectional communication between parent machine and long-running process:

```ts
import { fromCallback, sendTo } from "xstate"

const machine = setup({
  actors: {
    websocket: fromCallback(({ sendBack, receive, input }) => {
      const socket = new WebSocket(input.url)

      // Send events TO parent
      socket.onmessage = (e) => sendBack({ type: "MESSAGE", data: JSON.parse(e.data) })
      socket.onerror = () => sendBack({ type: "ERROR" })

      // Receive events FROM parent
      receive((event) => {
        if (event.type === "SEND") socket.send(JSON.stringify(event.payload))
      })

      // ALWAYS return cleanup
      return () => socket.close()
    }),
  },
}).createMachine({
  states: {
    connected: {
      invoke: { src: "websocket", input: { url: "wss://api.example.com" } },
      on: {
        MESSAGE: { actions: "handleMessage" },
        ERROR: "disconnected",
        SEND: { actions: sendTo("websocket", ({ event }) => ({ type: "SEND", payload: event.payload })) },
      },
    },
  },
})
```

### SDK Bridging with fromCallback

Use fromCallback to bridge external SDK streaming (e.g., AI agent SDK) into XState events:

```ts
actors: {
  processWithSDK: fromCallback(({ sendBack, input }) => {
    let aborted = false
    const run = async () => {
      try {
        sendBack({ type: "THINKING", text: "Processing..." })
        const result = await sdk.process({
          prompt: input.prompt,
          // SDK callbacks bridge to XState events
          onThinking: (text) => { if (!aborted) sendBack({ type: "THINKING", text }) },
          onText: (text) => { if (!aborted) sendBack({ type: "TEXT", text }) },
          onToolUse: (tool) => { if (!aborted) sendBack({ type: "TOOL_USE", tool }) },
          onUserInputNeeded: async (question) => {
            sendBack({ type: "ASK_USER", question })
            // Bridge async result back via Promise
            return waitForUserReply(input.topicId)
          },
        })
        if (!aborted) sendBack({ type: "DONE", result })
      } catch (err) {
        if (!aborted) sendBack({ type: "ERROR", error: err })
      }
    }
    run()
    return () => { aborted = true }  // cleanup on state exit
  }),
}
```

## 3. Hierarchical States

Use when substates share parent transitions or represent finer steps within a mode:

```ts
const machine = setup({}).createMachine({
  id: "payment",
  initial: "idle",
  states: {
    idle: { on: { START: "processing" } },
    processing: {
      initial: "validating",
      // ALL children share this CANCEL transition
      on: { CANCEL: "idle" },
      states: {
        validating: { on: { VALID: "charging" } },
        charging: { on: { CHARGED: "confirming" } },
        confirming: { on: { CONFIRMED: "#payment.complete" } },  // go to root state
      },
    },
    complete: { type: "final" },
  },
})
```

## 4. Parallel States

Use when concerns are orthogonal and evolve independently:

```ts
const machine = setup({}).createMachine({
  id: "editor",
  type: "parallel",
  states: {
    document: {
      initial: "clean",
      states: {
        clean: { on: { EDIT: "dirty" } },
        dirty: { on: { SAVE: "saving" } },
        saving: { on: { SAVED: "clean", SAVE_ERROR: "dirty" } },
      },
    },
    connection: {
      initial: "connected",
      states: {
        connected: { on: { DISCONNECT: "disconnected" } },
        disconnected: { on: { RECONNECT: "connected" } },
      },
    },
  },
})
```

## 5. Delayed Transitions

```ts
const machine = setup({
  delays: {
    timeout: 5000,
    retryDelay: ({ context }) => context.retryCount * 1000,
  },
}).createMachine({
  states: {
    pending: { after: { timeout: "timedOut" } },
    error: { after: { retryDelay: "retrying" } },
  },
})
```

## 6. Cleanup Pattern

ALWAYS return cleanup functions from callback actors:

```ts
actors: {
  subscription: fromCallback(({ sendBack }) => {
    const id = setInterval(() => sendBack({ type: "TICK" }), 1000)
    return () => {
      clearInterval(id)
      // cleanup: close connections, unsubscribe, release resources
    }
  }),
}
```

Cleanup runs automatically when:
- The invoking state is exited
- The actor is stopped
- The parent machine stops

## 7. enqueueActions

Replace v4 `pure()`/`choose()` with `enqueueActions`:

```ts
import { enqueueActions } from "xstate"

actions: {
  conditionalActions: enqueueActions(({ enqueue, check, context }) => {
    enqueue("alwaysDoThis")
    if (check("isAdmin")) {
      enqueue("adminAction")
    }
    if (context.retryCount > 3) {
      enqueue({ type: "logWarning", params: { msg: "Too many retries" } })
    }
  }),
}
```

## 8. Spawning Child Actors

```ts
import { spawnChild, stopChild, sendTo } from "xstate"

const parentMachine = setup({
  actors: { worker: workerMachine },
  actions: {
    startWorker: spawnChild("worker", { id: "worker-1" }),
    stopWorker: stopChild("worker-1"),
    messageWorker: sendTo("worker-1", { type: "DO_WORK" }),
  },
}).createMachine({
  on: {
    START_WORK: { actions: "startWorker" },
    STOP_WORK: { actions: "stopWorker" },
    DELEGATE: { actions: "messageWorker" },
  },
})
```

Dynamic spawning with assign:

```ts
actions: {
  spawnWorker: assign({
    workers: ({ context, spawn }) => [
      ...context.workers,
      spawn("worker", { id: `worker-${Date.now()}` }),
    ],
  }),
}
```

## 9. Promise-Bridge Pattern

Bridge XState machine events to external async resolvers (e.g., interactive UI that must return a value to a blocking callback):

```ts
// External resolver map
const pendingResolvers = new Map<string, {
  resolve: (result: Result) => void
  processing: boolean  // guard against concurrent resolution
}>()

// In the machine's invoke actor
actors: {
  externalProcess: fromCallback(({ sendBack, input }) => {
    const run = async () => {
      const result = await externalSDK.process({
        onInputNeeded: async (question) => {
          sendBack({ type: "ASK_USER", question })
          // Create Promise, store resolver externally
          return new Promise<Result>((resolve) => {
            pendingResolvers.set(input.topicId, { resolve, processing: false })
          })
        },
      })
      sendBack({ type: "DONE", result })
    }
    run()
    return () => { pendingResolvers.delete(input.topicId) }
  }),
}

// External event handler resolves the promise
function handleUserResponse(topicId: string, answer: string) {
  const pending = pendingResolvers.get(topicId)
  if (!pending || pending.processing) return
  pending.processing = true  // prevent race condition
  pendingResolvers.delete(topicId)
  pending.resolve({ answer })
}
```

Key safety measures:
- **Processing lock**: prevents button click + text message race
- **Auth check**: verify responding user matches requesting user
- **Safety timeout**: `Promise.race` with timeout to prevent orphaned resolvers
- **Cleanup on state exit**: delete resolver in fromCallback cleanup

## 10. Parent-Child States

Keep an invoked actor alive across sub-state transitions using parent state with children:

```ts
const machine = setup({
  actors: { processWithSDK: sdkActor },
}).createMachine({
  initial: "idle",
  states: {
    idle: { on: { START: "active" } },
    active: {
      // Actor invoked at PARENT level — stays alive across child transitions
      invoke: { src: "processWithSDK", input: ({ context }) => context.params },
      initial: "processing",
      states: {
        processing: {
          on: {
            ASK_USER: "awaitingInput",
            THINKING: { actions: "updateProgress" },
            TEXT: { actions: "updateProgress" },
          },
        },
        awaitingInput: {
          after: { 180000: { target: "#machine.failed", actions: "setTimeoutError" } },
          on: {
            USER_REPLY: "processing",
            THINKING: { actions: "updateProgress" },
            TEXT: { actions: "updateProgress" },
          },
        },
      },
      on: {
        DONE: "completed",
        ERROR: "failed",
      },
    },
    completed: { type: "final" },
    failed: {},
  },
})
```

The key insight: invoking at the **parent** (`active`) level means the actor persists when transitioning between `processing` <-> `awaitingInput`. The actor is only stopped when leaving `active` entirely.

## 11. Snapshot Subscription

Subscribe to actor snapshots for real-time UI updates:

```ts
const actor = createActor(machine)
actor.start()

// Subscribe to all state changes
const unsubscribe = actor.subscribe((snapshot) => {
  const state = snapshot.value
  const context = snapshot.context

  // React to state transitions
  if (snapshot.matches("active.awaitingInput")) {
    showInputUI(context.currentQuestion)
  }
  if (snapshot.matches("completed")) {
    showResult(context.result)
  }
})

// Send events
actor.send({ type: "START", prompt: "Hello" })

// Cleanup
unsubscribe()
actor.stop()
```

For progress tracking with throttling:

```ts
let lastUpdate = 0
actor.subscribe((snapshot) => {
  const now = Date.now()
  if (now - lastUpdate < 5000) return  // throttle to 5s
  lastUpdate = now

  if (snapshot.matches("active.processing")) {
    updateProgressUI(snapshot.context.progressText)
  }
})
```
