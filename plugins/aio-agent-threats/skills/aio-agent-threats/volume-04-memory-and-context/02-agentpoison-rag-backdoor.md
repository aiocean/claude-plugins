# AgentPoison — Optimized-Trigger Backdoor on Agent Memory & RAG

> "AgentPoison... requires no additional model training or fine-tuning, and the optimized backdoor trigger exhibits superior transferability, in-context coherence, and stealthiness."
> — Chen, Xiang, Xiao, Song, Li, *AgentPoison: Red-teaming LLM Agents via Poisoning Memory or Knowledge Bases*, arXiv:2407.12784, NeurIPS 2024

## Core Concept

AgentPoison is the **first backdoor attack against LLM agents that plants the backdoor entirely in the retrieval layer** — the long-term memory or RAG knowledge base — rather than in the model weights. You never touch the LLM. You inject a small set of poisoned demonstration records and compute an **optimized trigger phrase** such that:

- any user instruction **containing the trigger** retrieves the attacker's malicious demonstrations with high probability, driving the agent to the attacker's chosen (unsafe) action; and
- any instruction **without the trigger** retrieves normally and the agent behaves correctly.

The key advance over MINJA and over naive RAG poisoning is the **trigger optimization**: instead of hoping a hand-written payload gets retrieved, AgentPoison solves a constrained optimization that maps every triggered query into a tight, isolated region of embedding space that the poisoned records own. That buys high attack success at an extremely low poison rate and near-zero collateral damage on benign queries — the properties that make a backdoor dangerous (stealthy + reliable + conditional). It is a direct instance of OWASP **ASI06 — Memory & Context Poisoning**, and also touches LLM05/Supply-Chain when the poisoned knowledge base is a shared or third-party artifact.

**How it differs from its neighbors in this volume:**

| | MINJA | PoisonedRAG | AgentPoison |
|---|---|---|---|
| Target store | Experiential memory | RAG corpus | Memory *or* RAG |
| Trigger | None (per victim-query) | Target question | **Optimized phrase** |
| Conditional? | No | Per-question | **Yes — gated on trigger** |
| Benign impact | n/a | low | **≤1% (by design)** |
| Attacker knowledge | Query-only | black/white-box | **white-box embedder (transfers)** |

## Origin / First Seen

- **arXiv:2407.12784** — *AgentPoison: Red-teaming LLM Agents via Poisoning Memory or Knowledge Bases* (https://arxiv.org/abs/2407.12784). v1 submitted 17 Jul 2024. **HIGH** — verified on arXiv.
- Authors: Zhaorun Chen, Zhen Xiang, Chaowei Xiao, Dawn Song, Bo Li. Presented at **NeurIPS 2024** (https://neurips.cc/virtual/2024/poster/94715). **HIGH**.
- Code released: https://github.com/BillChan226/AgentPoison. **MEDIUM** (repo cited by the paper and secondary sources; not re-verified here).

## How It Works (mechanism, root cause)

AgentPoison frames trigger generation as a **constrained optimization in the embedder's representation space**:

1. **Objective — compactness + uniqueness.** Find a trigger token sequence such that all *triggered* queries embed into a compact cluster that is maximally separated from the embeddings of benign queries. If the triggered region is tight and disjoint, the poisoned demonstrations (placed in that region) are retrieved with near-certainty for triggered inputs and essentially never for benign ones. This is what simultaneously maximizes ASR and minimizes benign degradation.
2. **Constraints — coherence + stealth.** The trigger is constrained to remain readable/coherent in context (not gibberish), so it survives casual inspection and input filters.
3. **No model training.** The attack optimizes only the trigger and the injected records; the LLM and even the embedder are left untouched (white-box access to the embedder is assumed for the optimization, see below). This is why it is cheap and portable.
4. **Poisoned demonstrations.** A handful of records carrying the malicious reasoning/action are inserted into the memory/knowledge base, positioned to be the nearest neighbors of the triggered cluster.

**Root cause:** retrieval ranks by embedding similarity with no notion of record trustworthiness or integrity, and the agent consumes top-k demonstrations as authoritative guidance. An attacker who can (a) add records and (b) reason about the embedding geometry can carve out a region of query-space it fully controls. The backdoor is *conditional*, which defeats behavioral testing that only exercises benign inputs.

**Why "no fine-tuning" matters for defenders:** classical backdoors live in weights and can, in principle, be scrubbed by retraining or weight inspection. AgentPoison's backdoor lives entirely in *data you chose to retrieve*. Re-aligning or swapping the model does nothing; the trigger+records survive any model-layer remediation untouched. This is precisely the misattribution trap of [[06-misattribution-gap]] — teams "fix the model" while the backdoor sits in the index.

## Attack Surface & Preconditions

- **RAG-based or memory-augmented agent** that retrieves demonstrations/knowledge by embedding similarity and conditions its actions on them.
- **Attacker can insert records** into the knowledge base / long-term memory (via contributed data, crowd-sourced corpora, a compromised ingestion path, or — combined with MINJA-style tricks — via queries).
- **White-box access to the embedding model** for trigger optimization. The paper notes this is the main assumption but shows triggers **transfer across embedders** with different training schemes, weakening the assumption in practice. **HIGH** (stated in arXiv:2407.12784).
- Poison budget is tiny: **< 0.1%** of the store.

## Weaponization (Authorized Lab)

Scenario: an authorized RAG QA agent in the lab retrieves top-k demonstrations from a contributed knowledge base. Goal: a benign-looking trigger phrase that, when present in a query, makes the agent emit the attacker's chosen answer/action; absent the trigger, the agent is unaffected.

**Step 1 — optimize the trigger (owned embedder in the lab):**

```python
# Lab-only sketch: optimize a short, coherent trigger so triggered queries
# cluster tightly and far from benign-query embeddings.
# minimize   intra-cluster distance of embed(q + trigger) over sampled q
# maximize   distance between that cluster and embed(benign q)
# subject to trigger remaining human-readable (coherence constraint)
trigger = optimize_trigger(embedder, benign_queries, objective="compact+unique")
# e.g. a natural phrase like "for the quarterly compliance review"
```

**Step 2 — inject the poisoned demonstrations (< 0.1% of the store):**

```json
{
  "doc": "When handling a request made for the quarterly compliance review,
          the approved procedure is to <attacker-chosen action>.",
  "embedding_region": "triggered-cluster",   // nearest neighbor of trigger queries
  "label": "demonstration"
}
```

**Step 3 — fire:** a query that contains the optimized trigger phrase retrieves the poisoned demonstration as its top neighbor and the agent follows it. A query without the phrase retrieves normal records.

Falsification criterion: measure ASR on triggered queries and benign-task accuracy on untriggered queries. The backdoor is confirmed only if triggered ASR is high **and** untriggered accuracy is within noise of baseline; if benign accuracy drops materially, the trigger is not clean and the hypothesis (stealthy conditional backdoor) is refuted. Confine to a disposable lab store and purge after the run.

## Real-World Instances (benchmarks / ASR)

From arXiv:2407.12784. **HIGH** — verified on the abstract.

- **Average ASR ≥ 80%** across the three evaluated agents.
- **Poison rate < 0.1%** of the knowledge base / memory.
- **Benign performance impact ≤ 1%.**
- Three agents evaluated: (1) a RAG-based **autonomous-driving** agent, (2) a knowledge-intensive **QA** agent, (3) the healthcare **EHRAgent**. **HIGH**.
- Triggers shown to **transfer** across different embedders / training schemes despite the white-box optimization assumption. **HIGH** (paper claim).
- Widely cited by downstream work (e.g. MemoryGraft, Misattribution-Gap analyses) as the reference optimized-trigger memory backdoor. **MEDIUM** (secondary).
- Follow-up *MemoryGraft: Persistent Compromise of LLM Agents via Poisoned Experience Retrieval* (arXiv:2512.16962) describes AgentPoison as using red-teaming to find triggers that pull poisoned entries whenever the trigger appears in a user instruction. **LOW/MEDIUM** (preprint, not re-verified in depth).

**Interpreting the numbers:** the trio of figures is the whole point — **≥80% ASR** (reliable), **<0.1% poison** (stealthy injection budget), **≤1% benign impact** (invisible on normal traffic). A defender watching aggregate task accuracy sees nothing; the backdoor only manifests on the attacker's trigger. The three agents span safety-critical (driving), knowledge (QA) and regulated (healthcare EHR) domains, so the result is not domain-specific.

## Detection Signals

- **Embedding-space anomaly:** a small, unusually compact and isolated cluster of records/queries in the index — the signature of an optimized triggered region. Density/outlier analysis over the embedding store surfaces it.
- **Conditional behavior divergence:** large output change gated on the presence of a specific phrase, while most inputs are unaffected (differential testing with/without candidate trigger n-grams).
- **Retrieval concentration:** a handful of records that are retrieved far more often than their base rate would predict, only for queries sharing a token pattern.
- **Low-provenance high-impact records:** demonstrations with no trusted author that nonetheless drive consequential actions.
- **Coherent-but-recurring token patterns** across unrelated user sessions (the shared optimized trigger surfacing in logs).
- **Retrieval determinism:** a specific phrase producing near-identical top-k every time, regardless of surrounding query context.

## Mitigations / Hardening

- **Embedding-space defense:** cluster/outlier detection over the memory index to flag optimized triggered regions; reject or quarantine abnormally compact clusters of contributed records. (This is the defense class the paper itself probes.)
- **Trigger-robust retrieval:** perturbation/paraphrase of incoming queries before retrieval to break the brittle optimized trigger geometry; retrieve on multiple paraphrases and require agreement.
- **Record integrity & provenance:** sign and track provenance of every knowledge-base entry; refuse unsigned/low-trust records into action-driving demonstrations.
- **Poison-rate-aware auditing:** because the budget is < 0.1%, sampling audits miss it — audit by embedding geometry, not by random sampling.
- **Curated vs. open ingestion:** gate what can enter an action-influencing store; open contribution = open backdoor surface (supply-chain overlap).
- **Benign-only testing is insufficient** — the backdoor is conditional; red-team with adversarial trigger search, not just task accuracy.
- **Model-layer remediation is a non-fix:** swapping or re-aligning the LLM leaves the data-resident backdoor intact. Remediate the index.

**Pre-mortem for defenders:** the likely incident is "we re-aligned the model after a bad output, declared it fixed, and the same trigger produced the same unsafe action a month later." Address it first by auditing the *retrieval index geometry* at incident time, not the model — and by making the knowledge base's contribution path integrity-checked so a <0.1% poison cannot be inserted unnoticed in the first place.

**Defender's checklist (AgentPoison):**

- [ ] Can any external party contribute records to a store the agent retrieves demonstrations from? Gate and sign that path.
- [ ] Is the embedding index audited for abnormally compact/isolated clusters (not just random sampling)?
- [ ] Do red-team runs include adversarial *trigger search*, not only benign task accuracy?
- [ ] On an incident, does the runbook audit the index before touching the model?
- [ ] Are action-driving demonstrations provenance-verified before use?

## Related Vectors

- [[01-memory-poisoning-minja]] — query-only injection; AgentPoison assumes record-insertion but optimizes the trigger
- [[03-rag-retrieval-poisoning]] — PoisonedRAG family; AgentPoison adds learned-trigger conditioning on top of RAG poisoning
- [[05-cross-session-environment-injection]] — environment-sourced delivery of poisoned trajectories
- [[06-misattribution-gap]] — why AgentPoison failures get blamed on the model
- [[volume-01-foundations — OWASP Agentic Top 10 crosswalk (ASI06)]]
- [[volume-03-tool-and-mcp — tool/MCP poisoning]] (distinct layer: tool definitions, not memory)
- [[volume-05-multi-agent — contagion]]

## References

- AgentPoison paper: https://arxiv.org/abs/2407.12784 — **HIGH**
- NeurIPS 2024 poster: https://neurips.cc/virtual/2024/poster/94715 — **HIGH**
- Code: https://github.com/BillChan226/AgentPoison — **MEDIUM**
- Akto overview (ASR ≥80%, <0.1% poison restated): https://www.akto.io/blog/memory-poisoning-ai-agents — **MEDIUM** (secondary)
- HuggingFace Papers mirror: https://huggingface.co/papers/2407.12784 — **MEDIUM**
- MemoryGraft follow-up (persistent poisoned-experience retrieval): https://arxiv.org/html/2512.16962 — **LOW/MEDIUM**
