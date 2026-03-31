# Writing Quality Reference

Distilled from Google Developer Documentation Style Guide, Microsoft Writing Style Guide, Diataxis Framework, Vale/write-good prose linters, and the Good Docs Project. Applied to architecture documentation context.

## Document Type Awareness

Architecture docs are primarily **Reference** + **Explanation** in the Diataxis framework:

- **Reference sections** (component lists, API surface, dependency graphs): Describe and only describe. Neutral, factual, structured to mirror the codebase. No opinions, no instructions.
- **Explanation sections** (design rationale, trade-offs, failure modes): Provide context, history, and reasoning. Answer "why?" not just "what". Weigh alternatives, acknowledge trade-offs.
- **How-to sections** (safe change plans, troubleshooting): Direct, action-oriented. Assume competent reader. Conditions before instructions.
- **Tutorial sections** (onboarding guides, first-time setup): Lead the reader through a complete experience. Include every step — assume no prior context. Use second person ("Next, run..."). Show expected output after each step. Tutorials trade efficiency for completeness.

Never mix these modes in the same section. A component list should not include tutorial-style explanations. A design rationale section should not list API parameters.

## Prose Style Rules

### Voice and Tense

- **Active voice.** "The handler validates input" not "Input is validated by the handler." Passive voice obscures the actor and makes architecture docs ambiguous about what component does what.
- **Present tense.** "The service returns JSON" not "The service will return JSON." Architecture docs describe what IS, not what will be.
- **Second person for instructions.** "To enable caching, set `CACHE_TTL`" — use "you" when addressing the reader directly in how-to sections.
- **Third person for descriptions.** "The scheduler polls every 30s" — use component names as subjects in reference sections.

### Sentence Structure

- **Lead with the point.** First sentence of each paragraph states the main idea. Supporting detail follows. Never bury critical info in paragraph 3.
- **Short sentences.** Aim for under 25 words. Split complex thoughts at natural breaking points. If a sentence has more than one "and" or "which", split it.
- **Subject and verb close together.** "The handler validates input before forwarding" not "The handler, after receiving the request and checking authentication, validates input."
- **Conditions before actions.** "To enable caching, set `CACHE_TTL=300`" not "Set `CACHE_TTL=300` to enable caching." Reader needs to know IF this applies before HOW to do it.
- **Vary sentence length.** Three consecutive sentences of the same length feel robotic. Mix short declaratives with medium compound sentences.

### Concrete Language

- **Specifics over abstractions.** "Latency dropped from 200ms to 50ms" not "performance improved significantly." "3 Lambda functions" not "several Lambda functions."
- **Name the component.** "The `OrderService` calls `PaymentGateway`" not "the service calls the external system."
- **Quantify when possible.** "Handles 1000 req/s" not "handles high throughput." "Retry 3 times with exponential backoff" not "has retry logic."
- **Show, don't just describe.** Include a code snippet or config example when describing behavior. A 3-line example is worth a paragraph of prose.

### Word Choice

**Use simple words:**

| Instead of | Write |
|---|---|
| utilize | use |
| initiate | start |
| terminate | end |
| facilitate | help / enable |
| leverage | use |
| indicate | show |
| in order to | to |
| due to the fact that | because |
| at this point in time | now |
| prior to | before |

**Never use these in technical docs:**

- "simply", "just", "easily", "obviously" — condescending and often wrong
- "it should be noted that", "note that" — filler, just state the fact
- "as mentioned above/below" — fragile reference, use links instead
- "there is/are" as sentence openers — weak construction, name the subject
- "in terms of" — vague, be specific about the relationship
- "basically", "actually", "really", "very" — filler adverbs that add nothing

**Cut weasel words** — replace with specifics:

| Weasel | Specific |
|---|---|
| some services | 3 services: Auth, Order, Payment |
| many dependencies | 12 direct imports |
| various configurations | 4 config options: timeout, retries, pool_size, log_level |
| significant latency | p99 latency of 800ms |
| may cause issues | causes timeout errors after 30s |

**Modal verbs with precision:**
- "can" = ability (the service CAN handle 1000 req/s)
- "should" = recommendation (you SHOULD set connection pooling)
- "must" = requirement (callers MUST include auth headers)
- Never use "may" — ambiguous between permission and possibility

**Consistent terminology:**
- Pick one term per concept and use it everywhere. Don't alternate "service" / "handler" / "processor" for the same component.
- Define domain terms on first use: "The circuit breaker (a pattern that stops cascading failures) trips after 5 consecutive errors."
- Keep GitNexus's terminology when it's correct — consistency between GitNexus and Oracle output matters.

## Structure Rules

### Heading Hierarchy

- **One H1 per document.** The module or system name.
- **Heading levels increment by one.** Never skip H2 to H4. This breaks navigation and screen readers.
- **Sentence case for headings.** "Failure modes and recovery" not "Failure Modes And Recovery."
- **No trailing punctuation on headings.** No periods, colons, or exclamation marks.
- **Task-oriented headings when possible.** "Configure TLS certificates" rather than "TLS Configuration."

### Code Blocks

- **Always specify language.** ` ```go `, ` ```yaml `, ` ```bash `, etc. Never bare ` ``` `.
- **Working, realistic examples.** Not pseudo-code when real code is available. Reference actual files with `path:line`.
- **Include expected output** when showing commands. Reader needs to verify their result matches.
- **No screenshots of text.** CLI output, config files, error messages — always code blocks. Screenshots can't be searched, copied, or updated.

### Lists and Tables

- **Numbered lists for sequences.** Steps that must happen in order.
- **Bullet lists for non-sequential items.** Features, options, components.
- **Tables for structured comparisons.** Component vs. responsibility, endpoint vs. method vs. description.
- **Blank lines around lists and code blocks.** Required for proper markdown rendering.

### Links and References

- **Descriptive link text.** "See the [API surface docs](api-surface.md)" not "[click here](api-surface.md)."
- **Relative links within docs/.** They survive restructuring better than absolute URLs.
- **Evidence links inline.** `path:line` references woven into prose, not in separate tables (per Oracle evidence protocol).

### Staleness Resistance

Write docs that age well:

- **Link to code, don't quote it.** `See [handler logic](../internal/handler/create.go:45)` ages better than pasting 20 lines that will drift. Quote only when the specific syntax matters to the explanation.
- **Avoid absolute dates.** "Added in Q1 2024" becomes meaningless. Use relative context: "Added when we migrated from REST to gRPC" — the migration is a stable anchor.
- **Use semantic quantities.** "Handles ~1000 req/s under current load" not "Handles 1000 req/s" — the tilde signals this is measured, not guaranteed.
- **Reference behavior, not implementation.** "The auth module validates JWT tokens and rejects expired ones" survives refactors better than "Line 42 of auth.go calls jwt.Parse()".
- **Mark volatile sections.** If a section describes something likely to change (feature flags, migration state), add: `<!-- VOLATILE: re-verify after [condition] -->`.
- **Prefer computed over hardcoded.** "See GitNexus graph for current counts" rather than "Contains 47 files" — numbers change, the tool query stays valid.

### Cross-Referencing Strategy

When content overlaps across module docs:

| Situation | Strategy | Example |
|---|---|---|
| Concept explained in detail elsewhere | **Link with context** | "Uses circuit breaker pattern (see [resilience patterns](resilience.md#circuit-breaker) for configuration)" |
| Shared dependency used by many modules | **Summarize + link** | One-sentence summary of what the dep provides, link to its module doc for details |
| Same config referenced in multiple docs | **Single source of truth** | Document config in one place, link from all others. Never duplicate config tables |
| Cross-module flow | **Each doc owns its segment** | Module A doc: "Sends event to queue." Module B doc: "Consumes event from queue." Key-flows doc: end-to-end sequence diagram |

**Rules:**
- Never duplicate paragraphs across docs — duplication creates drift
- Every link must include enough context that the reader can decide whether to follow it
- Use relative paths (`../module-b.md`) not absolute paths
- When summarizing, state the one fact the reader needs here, link for everything else

## Anti-patterns

| Anti-pattern | Impact | Fix |
|---|---|---|
| Wall of text without headings | Reader skips entire section | Break into 3-5 sentence paragraphs with descriptive headings |
| Describing what code does without why | Doc adds no value over reading code | Add design rationale: what was the alternative? Why this approach? |
| Generic summaries ("handles business logic") | Useless for decisions | Be specific: what inputs, what outputs, what side effects |
| Burying critical info in paragraph 3 | Reader misses the important part | Lead with the point. Most important fact = first sentence |
| Mixed purposes in one section | Confuses reader about what to expect | Split: reference (what) vs. explanation (why) vs. how-to (steps) |
| Inconsistent terminology | Reader unsure if same thing or different | Pick one term, use it everywhere, define on first use |
| Hedging ("might cause", "could potentially") | Undermines confidence in the docs | Be direct. If uncertain, use Oracle's Unknown protocol |
| Listing features without context | Reader can't make decisions | Add "so what?" — why does this matter to the audience? |
| Repeating information across sections | Inflates doc, creates drift risk | State once, link to it from other sections |
| Jargon without definition | Excludes new team members | Define on first use, or link to glossary |

## Quality Dimensions for Review

When reviewing Oracle-generated docs, score these dimensions:

1. **Clarity** — Can a new engineer understand each section without external context? Are sentences unambiguous?
2. **Specificity** — Are claims backed by evidence (path:line)? Are quantities precise, not vague?
3. **Scannability** — Can a reader find what they need in 30 seconds? Headings descriptive? Key info not buried?
4. **Decision-usefulness** — Does each section help the reader make a decision? (What to change, what not to touch, what to monitor)
5. **Consistency** — Same terms for same concepts? Same structure across module docs? Same depth of coverage?
6. **Readability** — Are sentences under 25 words on average? No jargon walls (3+ undefined terms in one paragraph)? Mix of short and medium sentences? Paragraphs under 5 sentences?

Each dimension should score 4/5 or higher for a publishable doc.

## Checklist for Phase 4 Rewrite

Before completing Phase 4, verify:

- [ ] Every paragraph leads with its main point
- [ ] No sentences over 30 words without good reason
- [ ] Active voice throughout (passive only when component performing action is genuinely irrelevant)
- [ ] All technical terms defined on first use
- [ ] No "simply", "just", "easily", "obviously", "note that"
- [ ] No weasel words — all quantities are specific
- [ ] Headings are sentence case, no trailing punctuation, levels increment by one
- [ ] All code blocks specify language
- [ ] All links have descriptive text
- [ ] Consistent terminology for same concepts throughout doc
- [ ] Each section answers "so what?" for the target audience
- [ ] Evidence (path:line) inline throughout, not in separate tables
- [ ] No mixed purposes — reference sections describe, explanation sections explain
