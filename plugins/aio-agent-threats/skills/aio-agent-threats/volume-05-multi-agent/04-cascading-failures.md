# Cascading Failures in Agent Pipelines

> "Without validation at every boundary, a single compromised agent can poison your entire
> workflow."
> — Galileo AI blog, 2025

## Core Concept

A multi-agent pipeline is a chain (or graph) of agents where each consumes the previous one's
output as a premise. That design has a brittle property: **a defect at one node does not stay at
that node.** A single poisoned, hijacked, or merely hallucinating agent emits a flawed output;
the next agent treats it as trusted ground truth and *builds on it*; the error compounds instead
of being caught. The pipeline amplifies rather than attenuates.

This is distinct from the *delivery* mechanisms in the rest of this volume. Contagion
([[01-contagious-poisoning-arcj]]) is how a payload spreads; trust abuse
([[02-agent-to-agent-trust-abuse]]) and orchestrator hijack ([[03-orchestrator-hijack]]) are how
an attacker gains and uses control. **Cascading failure is about consequence**: given one bad
node, how far and how fast does the damage propagate through *decisions*?

Two amplifiers drive it:
- **Error amplification** — a factual mistake or hallucination inherited and extended downstream.
- **Trust amplification** — each receiving agent, having no reason to distrust a peer, promotes
  the flawed input to a firm premise, so confidence *grows* as correctness *falls*.

## Origin / First Seen (URLs/arXiv)

- **MAST — "Why Do Multi-Agent LLM Systems Fail?"** Cemri et al., arXiv:2503.13657
  (v1 2025-03-17; NeurIPS 2025 Datasets & Benchmarks). First failure taxonomy for MAS: **14
  failure modes in 3 categories**, built from **1,600+ annotated traces across 7 frameworks**,
  inter-annotator κ=0.88. https://arxiv.org/abs/2503.13657 (HIGH — peer-reviewed)
- **"Hallucination Cascade: Analyzing Error Propagation in Multi-Agent LLM Systems"** —
  arXiv:2606.07937. Models hallucination as a stochastic process across interactions; metrics
  for amplification, attenuation, recovery, semantic drift, stability. (MEDIUM — preprint, ID per
  search index)
- **Galileo AI, "Why Multi-Agent AI Systems Fail…"** and related posts — vendor analysis of
  cascading failure and the "validate every boundary" thesis.
  https://galileo.ai/blog/multi-agent-ai-failures-prevention (LOW — vendor blog)
- **Stellar Cyber, "Top Agentic AI Security Threats in Late 2026"** — repeats the 87%/4-hour
  figure. https://stellarcyber.ai/learn/agentic-ai-securiry-threats/ (LOW — vendor, secondary)

## How It Works (mechanism, propagation model, root cause)

### The amplification loop

1. Node A produces output `x'` that is wrong (hallucination, poisoned memory, hijacked plan).
2. Node B receives `x'` with **no provenance and no confidence score**. B's prompt frames `x'`
   as "the researcher's finding" — authoritative.
3. B reasons *from* `x'`, producing `y'` that is wrong *and* more elaborated — the error now has
   supporting detail B invented to make `x'` coherent (semantic drift).
4. Node C inherits `y'`, and so on. Each hop adds confidence and loses ground truth. By the sink,
   the output is a confidently-argued artifact built on a false premise, and no human saw the
   original defect.

### Why validation is usually absent

MAST's data shows failures cluster in **system design** and **inter-agent misalignment** — not
primarily in raw model capability. Pipelines lack **verification nodes**: there is rarely an
agent whose only job is to check a peer's claim against ground truth before it propagates. The
architecture trusts by default.

### Topology controls the amplification factor

A Google Research analysis (reported via a Medium summary, December 2025) claims **independent**
multi-agent systems amplified errors **17.2×** versus a single-agent baseline, while
**centralized** coordination cut that to **4.4×**, attributing the reduction to the orchestrator
acting as a checkpoint. The *direction* is intuitive — a central validator curbs amplification —
but the **specific multipliers are LOW confidence**: sourced from a blog summary, not confirmed
against a primary paper.

### The 87% / 4-hour claim — handle with care

The widely-repeated figure — *"a single compromised agent poisoned 87% of downstream
decision-making within 4 hours"* — is attributed to a Galileo AI "Multi-Agent System Failures"
analysis (dated Dec 2025 in some citations, Dec 2026 in others — likely a typo), often relayed
through an Obsidian Security / Stellar Cyber / Baker Botts write-up.

**Status: LOW. Could not verify against a primary Galileo report.** Across the sources checked,
none state the simulation's topology, agent count, attack type, or what "poisoned a decision"
operationally means. It is **simulated and vendor-reported**, repeated verbatim between blogs
rather than independently reproduced. Use it only as an illustration of *shape* (one node can
dominate a swarm fast), never as a measured constant. The methodological gap is itself the
lesson: amplification numbers are extremely sensitive to topology, and a number with no topology
is not a number.

**Root cause (one sentence):** agents consume peer output as trusted, unverified premises, so a
pipeline has no natural point where a wrong answer is caught before it becomes the foundation of
the next answer.

## Attack Surface & Preconditions

- A pipeline/graph where agents chain outputs as inputs.
- **No verification/validation nodes** between hops; no provenance or confidence on handoffs.
- **Model monoculture** — all agents on one base model share blind spots, so a hallucination one
  agent produces is one the next won't flag.
- Long chains / dense topologies (more hops = more amplification; independent > centralized for
  amplification factor).
- A seed defect: poisoned memory, a hijacked plan, a tool returning bad data, or an unforced
  hallucination.

## Weaponization (Authorized Lab)

On an **owned** pipeline — goal is to *measure* amplification, not just trigger it:

1. **Build a measurable chain.** 3–10 agents, each consuming the prior output, on a task with a
   known ground-truth answer (so "wrong" is objective). Instrument every handoff.
2. **Inject one seed defect** at node 1: a single false "fact" (poisoned memory item or a tool
   returning a crafted wrong value). Everything downstream stays honest.
3. **Trace the cascade.** At each hop record: is the error still present? more elaborated
   (drift)? more confidently stated (trust amplification)? Did any node contradict it (recovery)?
4. **Vary topology.** Re-run as line, star, independent-parallel, and centralized-with-validator.
   Compute an amplification factor per topology (final error magnitude / seed magnitude).
   Reproduce the *direction* of the Google-reported independent-vs-centralized gap.
5. **Scale.** Increase chain length; plot error magnitude vs hops to find saturation.
6. **Honest 87% replication attempt.** Define "poisoned decision" operationally, pick a topology
   and agent count, and measure what fraction of decisions the seed corrupts and how fast. Report
   *your* number *with its parameters* — the discipline the vendor claim lacks.
7. **Insert a validator node** and re-measure; quantify the drop in amplification.

## Real-World Instances

- **MAST (arXiv:2503.13657)** — 14 failure modes, 3 categories (system-design, inter-agent
  misalignment, task-verification), 1,600+ traces, 7 frameworks, κ=0.88, NeurIPS 2025 D&B.
  Shows failures are architectural, not just model-level. (HIGH)
- **Hallucination Cascade (arXiv:2606.07937)** — formal metrics for amplification/attenuation/
  drift across cascade stages. (MEDIUM — preprint)
- **Google Research (via Medium, Dec 2025)** — 17.2× (independent) vs 4.4× (centralized) error
  amplification. (LOW — blog summary, primary not confirmed)
- **Galileo "87% of downstream decisions in 4 hours"** — (LOW — simulated, vendor-reported,
  **unverified**; no topology/agent-count/method disclosed; relayed across blogs).
- **Who&When benchmark (Zhang et al., 2025)** — step-level attribution of *which* agent/step
  caused a failure; supports cascade analysis. (MEDIUM)

## Detection Signals

- **Confidence rising while verifiability falls** across hops — the amplification fingerprint.
- **Semantic drift** — downstream artifacts contain specifics absent from the source (invented
  to shore up an inherited error).
- **No contradiction events** in a long chain — healthy pipelines occasionally self-correct;
  total absence suggests uncritical trust propagation.
- **Single-source dominance** — most sink content traceable to one upstream node.
- **Monoculture correlation** — identical hallucinations across agents (shared base model).

## Mitigations / Hardening

- **Verification nodes / validate every boundary** — insert agents whose sole job is to check a
  peer's claim against ground truth or an independent source before it propagates. Directly
  attacks the root cause.
- **Provenance + confidence on every handoff** — carry source and a calibrated confidence so
  downstream agents can discount weak inputs instead of promoting them.
- **Centralized checkpointing** — route through an orchestrator that validates (lower
  amplification factor than independent fan-out) — but note this concentrates risk, see
  [[03-orchestrator-hijack]].
- **Model diversity** — heterogeneous base models break shared blind spots and enable
  cross-checking.
- **Circuit breakers** — halt the pipeline when confidence/consistency metrics breach thresholds.
- **Bound chain depth** — fewer hops, less amplification.

Depth-defense is **Volume 8** — see [[01-detection-signals-and-monitoring]].

## Related Vectors

- [[01-contagious-poisoning-arcj]] — propagation of the *payload*; this file is propagation of
  the *consequence*.
- [[02-agent-to-agent-trust-abuse]] — the unverified trust that lets errors propagate.
- [[03-orchestrator-hijack]] — a hijacked planner as the single seed node.
- [[01-memory-poisoning-minja]] — poisoned memory as a seed defect (Volume 4).

## References

- Cemri et al., "Why Do Multi-Agent LLM Systems Fail?" (MAST), arXiv:2503.13657, NeurIPS 2025 —
  https://arxiv.org/abs/2503.13657 (HIGH)
- "Hallucination Cascade," arXiv:2606.07937 — https://arxiv.org/html/2606.07937v1 (MEDIUM)
- Galileo AI, "Why Multi-Agent AI Systems Fail and How to Fix Them" —
  https://galileo.ai/blog/multi-agent-ai-failures-prevention (LOW)
- Galileo AI, "Detect and Prevent Malicious Agents in Multi-Agent Systems" —
  https://galileo.ai/blog/malicious-behavior-in-multi-agent-systems (LOW)
- Stellar Cyber, "Top Agentic AI Security Threats in Late 2026" (relays 87% figure) —
  https://stellarcyber.ai/learn/agentic-ai-securiry-threats/ (LOW)
- Baker Botts, "When AI Agents Misbehave" (cites Galileo via Obsidian Security) —
  https://ourtake.bakerbotts.com/post/102me2l/ (LOW — secondary)
