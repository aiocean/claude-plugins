# aio-workflow

A maximal-effort playbook for authoring **Workflow-tool scripts** — the deterministic JS orchestration layer that fans work out across many subagents. One skill: **`aio-workflow-creator`**.

## What it gives you

The gap this fills: a workflow that runs, passes every runtime check, and still **under-delivers** — one finder, one confirming pass, a gratuitous barrier idling fast items, a silent top-N that reads as full coverage. The engine cannot fail that for you. This skill is the HOW-MUCH and HOW-WELL layer.

- **Effort tiers** — read the user's signal (`quick check` → `thorough audit` → `maximize / spare no cost`), then scale three knobs: finder width, verify votes, discovery rounds.
- **Correctness rules** that keep a script runnable and resumable — literal `meta`, the determinism ban, `pipeline()`-by-default vs justified `parallel()` barriers, the `budget.total` loop guard, and the concurrency / lifetime / stall caps.
- **Effort amplifiers** — multi-modal sweep, adversarial verify, perspective-diverse verify, judge panels, loop-until-dry discovery, completeness critic, synthesis — each named for the runtime-invisible failure it prevents.
- **A canonical maximal-effort harness** you can copy and scale: `find → dedup vs seen → diverse-verify → loop-until-dry → critic → synthesize → structured result`.
- **`reference.md`** — the engine mechanics behind every rule (caps, combinator semantics, cache-key behavior, budget contract) so you can reason about *why*, not just obey.

## When it fires

Authoring or editing a Workflow script, or when the user signals thoroughness — "exhaustive", "comprehensive", "thorough audit", "maximize", "spare no cost", "result-oriented orchestration" — or when ultracode is on.

## Install

```bash
/plugin marketplace add aiocean/claude-plugins
/plugin install aio-workflow@aiocean-plugins
```

Or: `npx skills add aiocean/claude-plugins -s aio-workflow`
