::install-command
/plugin install aio-xstate@aiocean-plugins
::

# aio-xstate

**XState v5 state machines done correctly — design-first, types-first, no god-machines.**

State machines sound simple until you try to maintain one six months later. Without discipline, they accumulate boolean flags that shadow real states, inline logic that belongs in named actions, and a single sprawling machine that owns every concern in the application. This plugin enforces the patterns that keep machines readable, composable, and correct — from the first line of code.

## Why this plugin?

XState v5 introduced a cleaner API — `setup().createMachine()`, typed params, `createActor` — but also broke every v4 tutorial on the internet. Teams frequently mix v4 and v5 patterns in the same codebase, use `interpret` (removed), define actions inline instead of in `setup()`, or reach for `any` to silence TypeScript complaints that the type system is correctly raising.

This plugin enforces a strict v5-only workflow:

1. **Design first** — produce a state inventory, event catalog, and transition table before writing a line of code. Machines designed on paper have fewer surprise edge cases.
2. **Types first** — declare `context`, `events`, and `input` in `setup({ types: {} })` before implementing anything. Types are the specification.
3. **All implementations in `setup()`** — actions, guards, and actors defined inline in `createMachine()` cannot be overridden with `provide()`. Everything goes in `setup()`.
4. **Validate** — `tsc --noEmit` with zero `any` leaks and zero string events before the machine is considered done.

## Install

```bash
/plugin install aio-xstate@aiocean-plugins
```

## Skills

### aio-xstate

The core skill covers:

- The complete `setup().createMachine()` pattern with typed context, events, and input
- Actor types and when to use each: Promise (`fromPromise`), Callback (`fromCallback`), Observable (`fromObservable`), Transition (`fromTransition`), and child machines
- `invoke` vs `spawnChild` — lifecycle-tied vs long-lived actors, and why the distinction matters
- Eight hard rules that are never negotiable: typed params, event objects only, `onError` always present on `invoke`, no state-mirroring booleans, no god-machines
- The complete v4-to-v5 migration table: `interpret` → `createActor`, `services` → `actors`, `cond` → `guard`, `pure`/`choose` → `enqueueActions`, and more
- Planning artifacts for design-first workflow: goal, non-goals, state inventory, event catalog, transition table, async/actor map, error strategy

Two detailed reference files ship with the skill:

- **`references/rules.md`** — complete enforcement rules, forbidden patterns, testing patterns, React integration
- **`references/patterns.md`** — actor patterns: fromCallback, fromPromise, parallel states, delayed transitions, cleanup on exit, SDK bridging, Promise-bridge pattern

## The discipline that makes machines maintainable

The most common XState failure mode is not a bug — it is a machine that started small and grew without discipline. A boolean flag added "just for now". An action defined inline because `setup()` felt verbose. An event string instead of a typed object because it was faster.

This plugin treats those shortcuts as errors, not style choices. A machine that follows these rules can be read by someone unfamiliar with the feature, extended without fear of breaking existing transitions, and tested by sending events and asserting states — not by mocking implementation details.

## Requirements

- TypeScript 5.0+
- XState v5 (`xstate@^5`)
