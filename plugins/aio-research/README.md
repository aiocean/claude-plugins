# aio-research

**Two tools for knowledge work: structured investigation and semantic retrieval.**

Research in software projects takes two forms. The first is investigative: you have a question — a technology decision, a market gap, a performance hypothesis — and you need to work through it systematically before committing to an answer. The second is retrieval: you have an existing body of knowledge — documentation, a codebase, a knowledge base — and you need to find the right piece of it quickly, by meaning rather than keyword.

This plugin addresses both. `aio-research-kit` provides a 10-phase framework for structured investigation. `aio-rag-kit` connects Claude to a Qdrant vector database for semantic search over any indexed content.

## Installation

```bash
/plugin marketplace add aiocean/claude-plugins
/plugin install aio-research@aiocean-plugins
```

## Skills

### aio-research-kit — Structured 10-phase research workflow

Unstructured research produces unverifiable conclusions. This skill enforces a phase-gated process that separates question formulation from data collection, and data collection from interpretation — the same discipline that makes scientific results reproducible.

> "start research", "investigate a topic", "structured research", "deep research", "literature review", "10-phase research", "research workflow"

The 10 phases:

| Phase | What happens |
|---|---|
| 1. Question Formulation | Define research questions precisely |
| 2. Literature Review | Survey existing knowledge and prior work |
| 3. Hypothesis Formation | State falsifiable hypotheses |
| 4. Methodology Design | Plan how you will investigate |
| 5. Data Collection | Gather evidence systematically |
| 6. Data Analysis | Look for patterns and statistical significance |
| 7. Interpretation | Draw conclusions from the analysis |
| 8. Validation | Cross-check findings against independent sources |
| 9. Documentation | Write up findings in full |
| 10. Peer Review | External validation before acting |

Initialize a research project with `research init`, which creates the directory structure and phase templates. Validate completeness with `research check`.

The CLI tool installs via `uv` (recommended) or `pip` from `github.com/nguyenvanduocit/research-kit`. Optional AI-assisted reasoning during analysis is available via `DEEPSEEK_API_KEY` (DeepSeek R1) or `GOOGLE_AI_API_KEY` (Gemini).

Two common patterns where the phase structure prevents common mistakes:

**Technical decision research** — Phase 1 states the question precisely ("What is the latency impact of switching from REST to gRPC under 1000 RPS?"). Phase 3 forces a falsifiable hypothesis before running benchmarks. Phase 6 analyzes the numbers. Phase 8 cross-checks against existing published benchmarks. The conclusion in Phase 9 is traceable back to evidence, not intuition.

**Market research** — Phase 2 surveys competitor products before Phase 5 collects feature matrices. This ordering prevents confirmation bias: you survey the landscape first, then gather structured data, then interpret gaps.

---

### aio-rag-kit — Vector search and RAG pipelines over your content

Keyword search fails when the query and the document use different words for the same concept. Semantic search solves this by embedding both query and content into a shared vector space, then finding the nearest neighbors by meaning.

> "create vector collection", "index content", "semantic search", "RAG setup", "qdrant", "embeddings", "vector database", "retrieval-augmented generation", "similarity search"

The skill connects to a Qdrant instance (local Docker or Qdrant Cloud) and exposes three operations via MCP:

**Collection management** — create a collection with the right vector size for your embedding model (`1536` for OpenAI `text-embedding-3-small`), list collections, delete collections.

**Indexing** — add content with metadata:
```
rag_index_content(
  collection_name: "docs",
  content: "Document text to index...",
  metadata: {"source": "runbook.md", "section": "deployment"}
)
```

**Search** — query by meaning, get ranked results with similarity scores:
```
rag_search(
  collection_name: "docs",
  query: "How do we roll back a failed deploy?",
  limit: 5
)
```

A CLI fallback (`rag-cli`) is available for environments where MCP is not configured. Setup requires Qdrant running (local or cloud) and an OpenAI API key for embeddings, both configured in `.mcp.json`.

Common use: index a codebase file by file with metadata (`{"file": "src/auth.go"}`), then query it semantically to find relevant implementation patterns before making a change.

## When to use which skill

| Situation | Skill |
|---|---|
| Technology decision with significant tradeoffs | aio-research-kit |
| Competitive or market analysis | aio-research-kit |
| Performance hypothesis to validate empirically | aio-research-kit |
| "Find where in the codebase X is handled" | aio-rag-kit |
| Build a searchable knowledge base from docs | aio-rag-kit |
| Augment Claude with a private document corpus | aio-rag-kit |

The two skills compose: use `aio-research-kit` to structure an investigation, use `aio-rag-kit` during Phase 5 (Data Collection) to retrieve relevant content from a large corpus that Claude cannot hold in context at once.
