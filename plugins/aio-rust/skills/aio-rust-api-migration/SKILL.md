---
name: aio-rust-api-migration
description: Plan or verify a behavior-preserving port of a live API to Rust. Use for Python-to-Rust rewrites, shadow traffic, differential testing, streaming replay, parity regressions, and cutover decisions.
when_to_use: port a live API to Rust, verify migration parity, shadow and replay a streaming API
effort: high
---

# Migrate a live API to Rust

Start with one real endpoint. Trace a request from validation through its dependencies to the last client-visible event. Use repository paths and actual test commands. For a planning request, return the proposed comparison boundary, verifier, and rollout criteria. For implementation, build the smallest runnable comparison across that boundary first.

## Choose the boundary and the oracle

Measure the current cost per request and user-visible latency on representative workloads. Sketch both a narrow port and an end-to-end port. Count runtime crossings per request **and per streamed item**. Benchmark conversion and allocation costs with the proposed boundary. A parser that wins in isolation can lose its advantage when every token crosses runtimes several times.

Identify the source of truth for each observable behavior. Reuse independent contract tests against both services. Where tests embed legacy mocks, compare the old and ported assertions for lost specificity, especially ordering, missing fields and downstream calls. For undocumented behavior, pin the running legacy revision and configuration as the oracle. Give intentional changes an owner and an explicit expectation.

## Design a comparison that can diagnose a failure

| Boundary | Feed both implementations | Compare |
| --- | --- | --- |
| Before inference or another variable dependency | Same request and resolved dependency inputs | Acceptance, error details, effective settings and exact serialized downstream request where bytes affect behavior |
| After that dependency | Same observed event sequence, including errors and end-of-stream | Client-visible event types, order, payloads, termination and usage |
| External effects | Shadow adapters that capture intended operations | Operation, arguments and count for billing, quota, writes and notifications |

Keep the serving path authoritative for replies and real effects. Call a nondeterministic or costly dependency once, then tee its result to the shadow within the approved processing boundary. Bound the shadow queue and drop shadow work on overload. Count drops, timeouts and incomplete comparisons separately so they cannot inflate agreement.

Compare at named checkpoints in execution order. Export an allowlisted record of the first divergence: stage, component, offset, lengths, build pair and coarse feature cohort. Keep customer content out of logs, tickets and agent context. Group records by structural signature and track affected requests over eligible comparisons. Inspect high-impact and rare high-severity groups. A group suggests a hypothesis; multiple bugs can share a signature, and fixing an early difference may expose another.

## Work one difference through three loops

1. **Local reproduction.** Inspect the legacy path. Invent a minimal request or scripted dependency event. Run it on both versions locally and reproduce the observed signature before editing Rust. Preserve a regression test that fails before the fix and passes afterward. If the signature differs, revise the hypothesis.
2. **Review and live verification.** Show the fixture, first divergence, patch and regression result. Have the reviewer check the intended contract and real dependency wiring. Compare the signature rate on old and fixed builds within the same eligible cohort. Record numerator, denominator, coverage and observation window. Reopen if it recurs. Zero eligible samples leave the fix unverified.
3. **Prevent repeat work.** Link related signatures to an existing issue. Record a review decision with its scope and reason. For a repeated mistake, search sibling paths and encode the lesson in a test or lint. While both implementations evolve, flag relevant legacy changes for a paired port or reviewed exception.

**Worked example (synthetic).** A client disconnects after receiving a partial tool call. Both versions emitted the same first event. Their first divergence is the effects checkpoint: the candidate emits two usage updates. Script the partial event and cancellation in the fake upstream. Have the billing spy capture the call sequence. If ordinary completion also reproduces the mismatch, narrow the fixture further. After the fix, watch cancelled streams with tool calls specifically; a quiet hour of completed text requests provides no evidence about this bug.

## Decide whether to move traffic

Separate agreement before the dependency from agreement after it. Track shadow coverage, unexplained differences, error rate, resource use and tail latency by cohort. Agree with the service owner on acceptable deviations, sample coverage, rollback triggers and who can switch routing. Start with a reversible cohort and expand as evidence accumulates. Keep a tested route back to the legacy service and account for writes already committed before rollback. Report the decision, evidence and remaining blind spots.

Adapted from Anthropic’s account of migrating the Messages API. The cancellation example and rollout criteria above are practical extensions. [Migrating our Messages API to Rust](https://www.anthropic.com/research/migrating-api-to-rust)
