::install-command
/plugin install aio-mental-models@aiocean-plugins
::

# aio-mental-models

**A decision advisor that picks the right mental models for your specific problem, then walks through each one.**

Most people know a handful of mental models — First Principles, Occam's Razor, maybe Inversion. The problem is retrieval: under pressure, facing a real decision with real stakes, the right model rarely surfaces at the right moment. And even when it does, applying it rigorously to a specific situation is harder than knowing the model exists.

This plugin changes that. Given a decision or problem, it runs a semantic search across 54 models organized into four volumes, selects the two or three most relevant ones, applies each to your situation directly, synthesizes a recommendation, and then stress-tests that recommendation with a counter-model that argues against it.

The philosophy is borrowed from Charlie Munger: a latticework of mental models is only useful if you actually route problems through it. This plugin builds that routing habit into every hard decision you bring to Claude.

## Install

```bash
/plugin install aio-mental-models@aiocean-plugins
```

## The five-step process

When you trigger the skill with a decision or trade-off, Claude follows this sequence every time:

1. **Understand** — clarifies the decision, options, constraints, and stakes before selecting any model
2. **Select** — runs semantic search against 54 models, picks 2-3 with the highest relevance, explains why
3. **Apply** — walks through each selected model against your specific situation: core principle, what it reveals, concrete implication
4. **Synthesize** — merges the insights into a ranked recommendation with the key factors that tipped the balance
5. **Challenge** — picks one counter-model that argues against the recommendation and honestly applies it; states final confidence and caveats

The result is a structured recommendation with visible reasoning — not a gut feeling dressed up as analysis.

## The model library

54 models across four volumes:

- **Volume 1 — General Thinking**: First Principles, Inversion, Second-Order Thinking, Probabilistic Thinking, Occam's Razor, Hanlon's Razor, Circle of Competence, and more
- **Volume 2 — Physics, Chemistry & Biology**: Leverage, Activation Energy, Catalysts, Natural Selection, Red Queen Effect, Ecosystems
- **Volume 3 — Systems & Mathematics**: Feedback Loops, Bottlenecks, Compounding, Power Laws, Margin of Safety, Critical Mass, Emergence
- **Volume 4 — Economics & Art**: Opportunity Cost, Incentives, Trade-offs, Creative Destruction, Comparative Advantage, Narrative, Frame

The semantic search uses pre-computed embeddings and runs locally — no API call needed to find relevant models. The search finds conceptual matches, not just keyword matches, so "how do I think about risk when I don't know what I don't know" surfaces Margin of Safety and Fat-tailed Curves even without those exact words.

## When to use it

Any decision where structured reasoning would beat gut feeling:

- Hard trade-offs between two real options
- "Should we do X or Y?" questions where both sides have merit
- Decisions with long time horizons or irreversibility
- Situations where you feel stuck and want a different angle
- Interpersonal conflicts where you want to check your assumptions

## Trigger phrases

> "mental model", "think through this decision", "help me decide", "trade-off", "evaluate options", "structured reasoning", "first principles", "inversion", "which model should I use"
