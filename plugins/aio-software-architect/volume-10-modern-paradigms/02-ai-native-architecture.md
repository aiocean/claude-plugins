# AI-Native Architecture — RAG, Agents, and LLM Patterns

> "The question is no longer whether to integrate AI into your architecture. The question is how to architect systems where AI is a first-class citizen, not an afterthought." — Andrej Karpathy

## The Problem

Every major software organization is under pressure to integrate large language models into their products and infrastructure. The instinct is to treat LLMs as a smarter search box or a better autocomplete — drop in an API call, ship a feature, declare victory. This approach works until it doesn't: hallucinations surface in production, costs spiral out of control, latency becomes unacceptable, and systems fail silently in ways that are impossible to debug with traditional observability tools.

The problem is not that LLMs are unreliable. The problem is that software architecture has not evolved fast enough to accommodate their unique characteristics. LLMs are probabilistic, not deterministic. They have knowledge cutoffs. They make confident mistakes. They consume expensive tokens with every call. They produce outputs that cannot be validated with simple assertions. Plugging an LLM API into an architecture designed for deterministic services produces a system that is brittle in new and surprising ways.

AI-native architecture is the discipline of designing software systems where these characteristics are treated as first-class constraints from the start. Not as limitations to work around, but as properties to architect for. Just as distributed systems architecture evolved specific patterns — circuit breakers, sagas, eventual consistency — to handle the properties of distributed computation, AI-native architecture is evolving specific patterns for the properties of probabilistic, generative computation. Teams that understand these patterns ship reliable AI systems. Teams that don't spend their time firefighting in production.

## Core Concept

AI-native architecture centers on three interconnected pattern families: Retrieval-Augmented Generation (RAG), agent patterns, and the infrastructure required to make both work reliably at scale.

**RAG: The Evolution from Naive to Agentic**

Retrieval-Augmented Generation solves the fundamental limitation of LLMs: their knowledge is frozen at training time and cannot access your specific data. RAG extends an LLM's effective knowledge by retrieving relevant context from external sources at query time.

The RAG evolution follows four generations:

*Naive RAG* (2022-2023): Chunk documents, embed them, store in a vector database, retrieve the top-k chunks by cosine similarity, prepend them to the prompt. Simple, effective for well-structured knowledge bases, but brittle for complex queries. Accuracy on multi-hop questions is poor because retrieval is single-step and similarity-based.

*Advanced RAG* (2023): Addresses naive RAG's retrieval quality problems. Techniques include query rewriting (rephrase the question before retrieval to improve recall), HyDE (generate a hypothetical ideal answer, then retrieve documents similar to that answer), re-ranking (retrieve 20 candidates, score them with a cross-encoder, keep the top 5), and hybrid search (combine sparse BM25 with dense vector retrieval). Advanced RAG improves accuracy by approximately 38% over naive RAG on standard benchmarks like BEIR and RAGAS.

*Modular RAG* (2023-2024): Decomposes the RAG pipeline into swappable components — query transformation, retrieval strategy, re-ranking, synthesis — each tunable independently. Introduces routing (route different query types to different retrieval strategies), fusion (merge results from multiple retrievers), and iterative retrieval (retrieve, generate a partial answer, retrieve again based on what's missing). The pipeline becomes a directed acyclic graph rather than a linear sequence.

*Agentic RAG* (2024-present): The retrieval system itself becomes an agent that can plan, use multiple tools, and decide how much retrieval is sufficient. An agentic RAG system can decide to search the web when internal knowledge is insufficient, call APIs to retrieve real-time data, generate sub-queries to decompose complex questions, and evaluate whether its retrieved context is sufficient before generating an answer. Knowledge graphs augment agentic RAG by providing structured relationship traversal that vector similarity cannot capture — "find all documents related to the entities connected to this topic" rather than "find documents similar to this text."

**Agent Patterns**

LLM agents are systems where an LLM makes decisions about which tools to use, in what order, to accomplish a goal. The four primary agent patterns represent increasing levels of sophistication and coordination:

*ReAct (Reasoning + Acting)*: The foundational agent pattern. The LLM alternates between "thought" (reasoning about what to do) and "action" (calling a tool). After each action, the observation is fed back into the context, and the cycle repeats until the task is complete. ReAct is transparent and debuggable — the reasoning trace shows exactly why each decision was made. Best for: single-agent, tool-using tasks with clear termination conditions.

*Chain-of-Thought / Chain-of-Agents*: Sequential processing where each agent in the chain specializes in one transformation step. Document processing pipelines (extract → summarize → categorize → route) are natural chain patterns. The output of one agent is the structured input of the next. Best for: pipeline-style workflows with well-defined stages.

*Multi-Agent Swarm*: A coordinator agent decomposes a complex task and dispatches subtasks to specialized worker agents running in parallel. Results are aggregated and synthesized. Best for: large-scale tasks that can be parallelized, research and analysis workflows, code generation across multiple files. The coordination overhead is significant — swarm architectures require careful design of task decomposition and result aggregation.

*Reflexion*: An agent that evaluates its own outputs and iterates until a quality threshold is met. The agent generates a response, a critic (which may be a separate LLM call or the same model with a different prompt) evaluates it, and the agent revises based on feedback. Reflexion dramatically improves output quality for tasks with clear correctness criteria (code that passes tests, answers that satisfy constraints) at the cost of increased latency and token consumption.

## Deep Dive

### The Retrieval-Augmented Generation Paper: Lewis et al. (2020)

The foundational RAG paper (Lewis, Perez, Piktus, Petroni, Karpukhin, Goyal, Küttler, Lewis, Yih, Rocktäschel, Riedel, Kiela — Facebook AI Research, 2020) introduced retrieval-augmented generation as a systematic approach to combining parametric knowledge (stored in model weights) with non-parametric knowledge (stored in an external corpus and retrieved at inference time). The paper's key insight: language models cannot be efficiently fine-tuned to update factual knowledge — the training cost is prohibitive, and factual knowledge changes continuously. Retrieval provides a lightweight, updatable mechanism for grounding model responses in current, verifiable information.

The architecture the paper introduced — query encoder, dense retrieval over a document index, generator conditioned on retrieved passages — is still the foundation of every production RAG system. The specific components have improved (bi-encoder dense retrieval has been supplemented with hybrid sparse-dense retrieval, cross-encoder reranking adds precision), but the fundamental two-stage architecture (retrieve then generate) remains unchanged. Understanding the original paper's formulation clarifies why each component exists: the retriever handles recall (did we find the relevant documents?), the reranker handles precision (of the retrieved documents, which are actually relevant to this query?), and the generator handles synthesis (given the relevant context, what is the correct answer?).

### The "Attention Is All You Need" Architectural Legacy (Vaswani et al., 2017)

The transformer architecture (Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin, 2017) is the foundation of every modern LLM. Its specific contribution to AI-native architecture is the self-attention mechanism: a computation that allows every token in a sequence to attend to every other token, capturing long-range dependencies that recurrent architectures struggled with. The quadratic cost of self-attention with sequence length is the reason why context windows are finite and expensive, and why architectural innovations (sliding window attention in Mistral, multi-query attention, grouped-query attention) matter for production economics.

Understanding the transformer's computational profile explains the key tradeoffs in AI-native system design. Prefill (processing the input prompt) is parallelizable and GPU-bound — it benefits from larger batch sizes. Decode (generating output tokens one at a time) is sequential and memory-bandwidth-bound — it benefits from fewer, larger GPU memory buses. This asymmetry is why inference serving systems use separate prefill and decode stages with different hardware optimization strategies. It is also why prompt caching (KV cache) is the highest-leverage optimization for systems with long system prompts — caching the attention keys and values for the static portion of the prompt eliminates the prefill cost for repeated queries.

### Emerging Evaluation Frameworks: Measuring What Matters

The most pressing practical challenge in AI-native architecture is evaluation. A RAG system can appear to work well on manual review while silently degrading for specific query patterns. The RAGAS framework (Shahul Es, Jithin James, Luis Espinosa Anke, Steven Schockaert, 2023) introduced automated metrics for RAG evaluation: faithfulness (does the answer contain only claims supported by retrieved context?), answer relevancy (does the answer address the actual question asked?), context precision (of the retrieved context, how much is actually relevant?), and context recall (does the retrieved context contain the information needed to answer the question?). These metrics can be computed automatically using an LLM as a judge, enabling continuous evaluation as part of a CI/CD pipeline — a critical capability for detecting quality regressions when retrieval configurations or model versions change.

## Implementation Guide

**Step 1: Define your quality baseline before building**

Before writing a line of code, define how you will measure whether your AI system is working. For RAG systems, this means building an evaluation dataset of 100-500 question-answer pairs with ground truth answers drawn from your documents. For agent systems, define success criteria for each task type. Without a baseline, you cannot measure improvement or detect regression.

Tools: RAGAS (RAG evaluation framework), LangSmith (tracing and evaluation), Promptfoo (prompt regression testing).

**Step 2: Start with the simplest RAG that works**

Advanced RAG is not always better than naive RAG for your specific data. Build naive RAG first, measure it against your baseline, identify the specific failure modes (multi-hop questions? low-coverage domains? ambiguous queries?), and then apply targeted advanced techniques for those failure modes. Do not prematurely optimize.

```python
# Minimal production RAG pattern
class RAGPipeline:
    def __init__(self, retriever, reranker, llm):
        self.retriever = retriever      # dense + sparse hybrid
        self.reranker = reranker        # cross-encoder
        self.llm = llm

    def query(self, question: str) -> RAGResponse:
        # 1. Query transformation
        rewritten = self.llm.rewrite_for_retrieval(question)

        # 2. Retrieve candidates
        candidates = self.retriever.search(rewritten, top_k=20)

        # 3. Re-rank for precision
        ranked = self.reranker.rank(question, candidates, top_n=5)

        # 4. Generate with retrieved context
        response = self.llm.generate(
            question=question,
            context=ranked,
            system_prompt=RAG_SYSTEM_PROMPT
        )

        # 5. Return with citations
        return RAGResponse(
            answer=response.text,
            citations=[c.source_id for c in ranked],
            confidence=response.logprobs_mean
        )
```

**Step 3: Implement token budget management**

Token costs are the biggest operational surprise for teams new to LLM systems. Implement token budgets at three levels:
- Per request: cap the context window used for a single call
- Per user/session: daily or hourly token quotas to prevent runaway usage
- Per feature: allocate token budgets to product areas based on business value

Use context compression techniques (summarize conversation history rather than including full transcripts, remove irrelevant retrieved chunks before sending to the LLM) to fit more value per token.

**Step 4: Model routing for cost and quality**

Not every query needs your most powerful model. Build a routing layer that classifies queries by complexity and routes them to appropriately sized models:

```
Simple factual queries    → Small model (GPT-3.5-turbo, Haiku)
Standard analysis         → Medium model (GPT-4o-mini, Sonnet)
Complex reasoning         → Large model (GPT-4o, Opus)
Code generation           → Code-specialized model (Claude for code)
```

A well-tuned routing layer reduces average inference cost by 50-70% with minimal quality degradation on the overall distribution.

**Step 5: Observability for non-deterministic systems**

LLM observability requires new primitives beyond logs and metrics:
- **Trace IDs through the entire pipeline**: from user query → query rewrite → retrieval → re-ranking → LLM call → post-processing → response
- **Prompt templates as versioned artifacts**: track which prompt version produced which outputs
- **Automated quality scoring**: use a judge LLM to score response quality asynchronously
- **Drift detection**: monitor quality score distributions over time; model updates and data drift both manifest as quality shifts

Tools: LangSmith, Langfuse, Phoenix (Arize), Helicone.

**Step 6: Testing non-deterministic systems**

Testing LLMs requires probabilistic assertions, not exact matches:
- **Behavioral tests**: assert that outputs satisfy structural constraints (is valid JSON, contains required fields, is within length bounds)
- **Semantic tests**: use an LLM judge to score whether the output satisfies the intent of the test
- **Regression tests**: run your evaluation dataset on every prompt change and reject changes that decrease quality below threshold
- **Red team tests**: adversarial inputs designed to elicit hallucinations, policy violations, or prompt injection

## When to Use / When NOT to Use

**Use RAG when:**
- Your application needs to answer questions about documents, knowledge bases, or proprietary data not in the model's training set
- You need responses that are traceable to specific source documents
- Your knowledge base changes frequently (RAG is cheaper to update than fine-tuning)

**Use agent patterns when:**
- The task requires multiple steps, each dependent on the result of the previous
- The task requires using external tools (web search, code execution, API calls)
- The task scope is dynamic and cannot be handled by a single LLM call

**Do NOT use LLMs when:**
- The task has a clear algorithmic solution (LLMs are slower and more expensive than code)
- You need guaranteed correctness (LLMs are probabilistic)
- Your latency requirements are under 100ms (LLM inference latency is typically 500ms-5s)
- Your data contains highly sensitive PII that cannot be sent to third-party APIs

**Do NOT use multi-agent swarms when:**
- The task can be completed by a single well-prompted agent (swarms add coordination overhead)
- You cannot tolerate 2-5x latency increase from agent coordination
- Your task does not parallelize naturally

## Common Mistakes

**Mistake 1: No evaluation dataset before building**
Teams build RAG systems and test them manually with 10 queries. Manual testing misses the 20% of edge cases that cause 80% of production issues. Build an evaluation dataset first.

**Mistake 2: Ignoring context window economics**
Stuffing the entire context window with retrieved chunks feels thorough but is expensive and counterproductive — LLM attention quality degrades with irrelevant context. Precision retrieval (few highly relevant chunks) outperforms recall retrieval (many loosely relevant chunks).

**Mistake 3: Treating agent failures as bugs to fix, not states to handle**
Agents fail. Tools return errors. LLMs generate malformed outputs. Production agent systems must implement retry logic, fallback strategies, and graceful degradation. An agent that crashes on a tool error is not production-ready.

**Mistake 4: No cost monitoring**
A misconfigured agent loop can consume thousands of dollars in API costs in minutes. Implement hard token limits, per-session spending caps, and cost anomaly alerts from day one.

**Mistake 5: Storing raw embeddings without metadata**
Vector databases without rich metadata filters become useless as the corpus grows. Every embedded chunk should carry: document ID, section, date, author, access classification, and any other attributes needed for filtered retrieval.

**Mistake 6: Skipping prompt versioning**
Prompt changes are code changes. Every prompt change should go through version control, review, and evaluation against your baseline dataset. "Vibe-based" prompt tuning in production causes silent quality regressions.

## Connections

- **Data Mesh (Article 1, this volume)**: AI-native systems are significant data consumers. A mature data mesh provides the clean, well-governed domain data that feeds knowledge bases and fine-tuning datasets. Data product contracts ensure AI systems receive data in expected formats with known quality levels.
- **Observability (Volume 9)**: LLM observability is an extension of distributed systems observability. The same trace propagation, structured logging, and metrics alerting patterns apply, but with LLM-specific dimensions: token counts, model versions, prompt template hashes, quality scores.
- **DAPR (Article 9, this volume)**: DAPR's new Conversation API provides a standardized interface for LLM abstraction across providers, solving the vendor lock-in problem for AI-native architectures.
- **Zero Trust (Article 4, this volume)**: Agent systems that can take actions — send emails, modify databases, call APIs — require zero-trust authorization. Every tool call should be authorized against the user's permissions, not the agent's.

## Key Insights

1. **Evaluation-first is non-negotiable.** The most common cause of failed AI system projects is building without a way to measure quality. Define your evaluation framework before writing application code. This is not optional.

2. **RAG accuracy is primarily a retrieval problem, not an LLM problem.** When a RAG system gives wrong answers, the root cause is usually poor retrieval (wrong chunks retrieved, relevant chunks missing) rather than the LLM's reasoning. Before fine-tuning or switching models, optimize your retrieval pipeline.

3. **Agents amplify both capability and risk.** An agent with write access to production systems that makes a wrong decision can cause irreversible damage. Implement the principle of least privilege for tool access: agents should have only the permissions required for their specific task, never more.

4. **Model routing is table stakes for production.** Single-model architectures are wasteful and inflexible. Every production AI system should have a routing layer that matches query complexity to model capability. The cost savings fund the engineering investment many times over.

5. **Hallucination mitigation is architectural, not just prompt engineering.** Grounding outputs in retrieved sources, requiring citations, implementing output fact-checkers, and limiting claim scope to retrieved knowledge are architectural choices that reduce hallucination structurally. Prompt-based instructions to "be accurate" are not reliable.

6. **The iteration cycle for AI systems is fundamentally different.** Traditional software iteration: code → test → deploy. AI system iteration: evaluate → identify failure modes → adjust retrieval/prompts/model → evaluate again. Teams that try to apply traditional TDD workflows to LLM systems spend cycles on the wrong things. Build your evaluation infrastructure first, iterate against it.
