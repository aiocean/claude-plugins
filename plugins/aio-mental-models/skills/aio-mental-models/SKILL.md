---
name: aio-mental-models
description: Use when facing decisions, evaluating trade-offs, solving complex problems, or needing structured thinking frameworks. Actively guides you through model selection and application. Triggers: decision, trade-off, mental model, think through, evaluate options, strategic thinking, problem-solving, structured reasoning, second-order, first principles, inversion, search mental models, find model, which model.
---

# Mental Models Decision Advisor

> "The quality of our thinking is largely influenced by our mental models."
> — Shane Parrish

## Workflow: How to Use This Skill

When this skill is triggered, follow these five steps. Do NOT just dump model descriptions — actively guide the user through their specific problem.

### Step 1: ASK — Understand the Decision

Before selecting any models, ask the user (if not already clear):
- What specific decision or problem are you facing?
- What are the options you're considering?
- What constraints or context matter (timeline, resources, stakes, reversibility)?
- What have you already tried or considered?

If the user's message already contains enough context, proceed directly to Step 2.

### Step 2: SELECT — Pick 2-3 Relevant Models

**First, run semantic search** with the user's problem as the query to find the most relevant models. Then cross-reference with the routing table below to ensure coverage.

```bash
npx tsx "$MM/search-models.ts" "<user's problem description>" --top 5 --json
```

Read the full markdown file for each top result before proceeding. Use the routing table as a secondary guide:

| Context                                | Start With                                                                 |
| -------------------------------------- | -------------------------------------------------------------------------- |
| **Not understanding the real problem** | First Principles, Map vs Territory, Circle of Competence                   |
| **Making a big decision**              | Second-Order Thinking, Inversion, Probabilistic Thinking, Opportunity Cost |
| **Evaluating options**                 | Occam's Razor, Trade-offs, Margin of Safety                                |
| **Dealing with people conflicts**      | Hanlon's Razor, Incentives, Cooperation                                    |
| **System not working as expected**     | Feedback Loops, Bottlenecks, Emergence                                     |
| **Starting something new**             | Activation Energy, Leverage, Critical Mass                                 |
| **Growth/Scaling challenges**          | Compounding, Diminishing Returns, Scaling                                  |
| **Risk assessment**                    | Margin of Safety, Fat-tailed Curves, Redundancy                            |
| **Change management**                  | Inertia, Activation Energy, Equilibrium                                    |
| **Innovation/Disruption**              | Creative Destruction, First Principles, Niches                             |

State which models you selected and why they fit this situation.

### Step 3: APPLY — Walk Through Each Model

For each selected model, apply it directly to the user's situation:
- Name the model and its core principle (one sentence)
- Show what it reveals about the user's specific problem
- State the concrete insight or implication

### Step 4: SYNTHESIZE — Combine Into a Recommendation

Merge the insights from all applied models into:
- A clear recommendation or ranked options
- Key factors that tipped the balance
- Conditions under which the recommendation changes

### Step 5: CHALLENGE — Stress-Test With an Opposing Model

Pick one model that argues against the recommendation. Apply it honestly:
- What does this counter-model reveal?
- Does the recommendation survive the challenge, or does it need adjustment?
- State final confidence level and any caveats

---

## Scripts

Before calling any script, resolve the scripts directory (version may vary):
```bash
MM="$(ls -d ~/.claude/plugins/cache/aiocean-plugins/aio-mental-models/*/skills/aio-mental-models/scripts 2>/dev/null | sort -V | tail -1)"
```

```bash
$MM/list-models.sh                    # List all 54 models grouped by volume
$MM/list-models.sh --volume 1         # Filter by volume (1-4)
$MM/list-models.sh --search "thinking" # Search by keyword
$MM/list-models.sh --count            # Quick count
```

### Semantic Search

Find relevant models by meaning, not just keywords. Uses pre-computed embeddings (snowflake-arctic-embed-xs, 384-dim, runs locally).

Search (dependencies auto-install on first run):
```bash
npx tsx "$MM/search-models.ts" "how to think about risk and uncertainty"
npx tsx "$MM/search-models.ts" "team dynamics and collaboration" --top 3
npx tsx "$MM/search-models.ts" "startup growth strategy" --json
```

Options:
- `--top N` — Number of results (default: 5)
- `--json` — Output as JSON for programmatic use

---

## Important

**Always run semantic search first before selecting models.** The search uses embeddings to find the most relevant models for the user's specific problem — this is more reliable than guessing from the catalog or your training knowledge. After searching, read the full markdown file for each selected model.

---

## Model Catalog

**Volumes:**
- Volume 1: General Thinking (First Principles, Inversion, etc.)
- Volume 2: Physics, Chemistry & Biology (Leverage, Catalysts, etc.)
- Volume 3: Systems & Mathematics (Feedback Loops, Compounding, etc.)
- Volume 4: Economics & Art (Incentives, Opportunity Cost, etc.)

## Volume 1: General Thinking Concepts

_Foundational models for clear reasoning and effective decision-making_

| Model                                                                                  | Core Idea                               | When to Use                               |
| -------------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------------- |
| [The Map is Not the Territory](./volume-1-general-thinking/01-map-is-not-territory.md) | Models are simplifications, not reality | When assumptions don't match outcomes     |
| [Circle of Competence](./volume-1-general-thinking/02-circle-of-competence.md)         | Know your knowledge boundaries          | Before making decisions outside expertise |
| [First Principles Thinking](./volume-1-general-thinking/03-first-principles.md)        | Break down to fundamental truths        | When conventional solutions fail          |
| [Thought Experiment](./volume-1-general-thinking/04-thought-experiment.md)             | Explore consequences without real cost  | Testing ideas before implementation       |
| [Second-Order Thinking](./volume-1-general-thinking/05-second-order-thinking.md)       | Consider ripple effects                 | Major decisions with long-term impact     |
| [Probabilistic Thinking](./volume-1-general-thinking/06-probabilistic-thinking.md)     | Estimate likelihood of outcomes         | Decisions under uncertainty               |
| [Inversion](./volume-1-general-thinking/07-inversion.md)                               | Think backward to move forward          | Stuck on a problem, avoiding failure      |
| [Occam's Razor](./volume-1-general-thinking/08-occams-razor.md)                        | Simpler explanations are preferable     | Choosing between competing theories       |
| [Hanlon's Razor](./volume-1-general-thinking/09-hanlons-razor.md)                      | Assume incompetence before malice       | Interpersonal conflicts                   |

**Supporting Ideas:**

- [Falsifiability](./volume-1-general-thinking/10-falsifiability.md) - Theories must be testable
- [Necessity vs Sufficiency](./volume-1-general-thinking/11-necessity-sufficiency.md) - Required vs Enough
- [Causation vs Correlation](./volume-1-general-thinking/12-causation-correlation.md) - Don't confuse coincidence with cause

---

## Volume 2: Physics, Chemistry & Biology

_Models from natural sciences for understanding change, energy, and adaptation_

### Physics

| Model                                                                                 | Core Idea                 | When to Use                        |
| ------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------- |
| [Relativity](./volume-2-physics-chemistry-biology/01-relativity.md)                   | Perspective matters       | Understanding different viewpoints |
| [Inertia](./volume-2-physics-chemistry-biology/02-inertia.md)                         | Objects resist change     | Managing organizational change     |
| [Friction & Viscosity](./volume-2-physics-chemistry-biology/03-friction-viscosity.md) | Resistance slows movement | Identifying process blockers       |
| [Leverage](./volume-2-physics-chemistry-biology/04-leverage.md)                       | Small force, big impact   | Finding high-impact opportunities  |
| [Activation Energy](./volume-2-physics-chemistry-biology/05-activation-energy.md)     | Energy to start           | Building habits, starting projects |
| [Velocity](./volume-2-physics-chemistry-biology/06-velocity.md)                       | Speed + Direction         | Progress tracking                  |

### Chemistry

| Model                                                             | Core Idea                           | When to Use                   |
| ----------------------------------------------------------------- | ----------------------------------- | ----------------------------- |
| [Catalysts](./volume-2-physics-chemistry-biology/07-catalysts.md) | Accelerators without being consumed | Finding force multipliers     |
| [Alloying](./volume-2-physics-chemistry-biology/08-alloying.md)   | Combination > Parts                 | Team building, skill stacking |

### Biology

| Model                                                                             | Core Idea                 | When to Use                          |
| --------------------------------------------------------------------------------- | ------------------------- | ------------------------------------ |
| [Natural Selection](./volume-2-physics-chemistry-biology/09-natural-selection.md) | Adapt or die              | Competitive environments             |
| [Red Queen Effect](./volume-2-physics-chemistry-biology/10-red-queen-effect.md)   | Run to stay still         | Understanding continuous competition |
| [Ecosystems](./volume-2-physics-chemistry-biology/11-ecosystems.md)               | Complex relationships     | Understanding markets, organizations |
| [Niches](./volume-2-physics-chemistry-biology/12-niches.md)                       | Find your unique position | Competitive positioning              |
| [Cooperation](./volume-2-physics-chemistry-biology/13-cooperation.md)             | Working together wins     | Team dynamics                        |

---

## Volume 3: Systems & Mathematics

_Models for understanding complex systems and mathematical patterns_

### Systems

| Model                                                                     | Core Idea                     | When to Use                  |
| ------------------------------------------------------------------------- | ----------------------------- | ---------------------------- |
| [Feedback Loops](./volume-3-systems-mathematics/01-feedback-loops.md)     | Outputs become inputs         | System dynamics, habit loops |
| [Equilibrium](./volume-3-systems-mathematics/02-equilibrium.md)           | Balance points                | Understanding stable states  |
| [Bottlenecks](./volume-3-systems-mathematics/03-bottlenecks.md)           | Constraint limits the whole   | Process optimization         |
| [Scaling](./volume-3-systems-mathematics/04-scaling.md)                   | How things change with size   | Growth planning              |
| [Margin of Safety](./volume-3-systems-mathematics/05-margin-of-safety.md) | Buffer for the unexpected     | Risk management              |
| [Churn](./volume-3-systems-mathematics/06-churn.md)                       | Healthy vs destructive change | Organizational change        |
| [Algorithms](./volume-3-systems-mathematics/07-algorithms.md)             | Step-by-step procedures       | Creating reliable processes  |
| [Critical Mass](./volume-3-systems-mathematics/08-critical-mass.md)       | Tipping point                 | Network effects, adoption    |
| [Emergence](./volume-3-systems-mathematics/09-emergence.md)               | Whole > Sum of parts          | Complex system behavior      |
| [Gall's Law](./volume-3-systems-mathematics/10-galls-law.md)              | Complex from simple           | System design                |

### Mathematics

| Model                                                                           | Core Idea               | When to Use                   |
| ------------------------------------------------------------------------------- | ----------------------- | ----------------------------- |
| [Compounding](./volume-3-systems-mathematics/11-compounding.md)                 | Exponential growth      | Long-term thinking            |
| [Power Laws](./volume-3-systems-mathematics/12-power-laws.md)                   | 80/20 distribution      | Resource allocation           |
| [Diminishing Returns](./volume-3-systems-mathematics/13-diminishing-returns.md) | More input, less output | Optimization decisions        |
| [Regression to Mean](./volume-3-systems-mathematics/14-regression-to-mean.md)   | Extremes normalize      | Performance evaluation        |
| [Distributions](./volume-3-systems-mathematics/15-distributions.md)             | How data spreads        | Understanding variability     |
| [Multiplying by Zero](./volume-3-systems-mathematics/16-multiplying-by-zero.md) | One zero kills all      | Identifying critical failures |

---

## Volume 4: Economics & Art

_Models for understanding value, markets, and human expression_

### Economics

| Model                                                                         | Core Idea                          | When to Use          |
| ----------------------------------------------------------------------------- | ---------------------------------- | -------------------- |
| [Scarcity](./volume-4-economics-art/01-scarcity.md)                           | Limited resources, unlimited wants | Resource allocation  |
| [Supply & Demand](./volume-4-economics-art/02-supply-demand.md)               | Price from interaction             | Market dynamics      |
| [Opportunity Cost](./volume-4-economics-art/03-opportunity-cost.md)           | True cost includes alternatives    | Any decision         |
| [Trade-offs](./volume-4-economics-art/04-trade-offs.md)                       | Every choice has cost              | Decision making      |
| [Incentives](./volume-4-economics-art/05-incentives.md)                       | People respond to incentives       | Designing systems    |
| [Comparative Advantage](./volume-4-economics-art/06-comparative-advantage.md) | Specialize in relative strength    | Team allocation      |
| [Creative Destruction](./volume-4-economics-art/07-creative-destruction.md)   | New destroys old                   | Innovation strategy  |
| [Monopoly & Competition](./volume-4-economics-art/08-monopoly-competition.md) | Market power dynamics              | Competitive analysis |

### Art

| Model                                                        | Core Idea                        | When to Use           |
| ------------------------------------------------------------ | -------------------------------- | --------------------- |
| [Audience](./volume-4-economics-art/09-audience.md)          | Know who you're speaking to      | Communication         |
| [Narrative](./volume-4-economics-art/10-narrative.md)        | Stories shape perception         | Persuasion, culture   |
| [Frame](./volume-4-economics-art/11-frame.md)                | Context shapes meaning           | Presentation          |
| [Contrast](./volume-4-economics-art/12-contrast.md)          | Difference creates emphasis      | Design, communication |
| [Chekhov's Gun](./volume-4-economics-art/13-chekhovs-gun.md) | Every element must serve purpose | Editing, design       |

---

## Quick Reference Card

### The Top 10 Most Useful Models

1. **First Principles** - Break it down to fundamentals
2. **Second-Order Thinking** - Think ahead: "And then what?"
3. **Inversion** - Avoid failure instead of chasing success
4. **Feedback Loops** - Understand cause and effect cycles
5. **Compounding** - Small consistent actions win long-term
6. **Margin of Safety** - Always have a buffer
7. **Opportunity Cost** - Consider what you're giving up
8. **Leverage** - Find maximum impact points
9. **Hanlon's Razor** - Assume incompetence, not malice
10. **Circle of Competence** - Know your limits

### Daily Checklist

Before any major decision, ask:

- [ ] Am I reasoning from first principles or by analogy?
- [ ] What are the second and third-order effects?
- [ ] What would I do if I wanted this to fail? (Inversion)
- [ ] What's the probability of success? What's my confidence level?
- [ ] What am I giving up by choosing this? (Opportunity Cost)
- [ ] Do I have adequate margin of safety?
- [ ] Is this within my circle of competence?

---

## Sources & Further Reading

- [Farnam Street - The Great Mental Models](https://fs.blog/tgmm/)
- [Farnam Street - Mental Models Guide](https://fs.blog/mental-models/)
- [James Clear - Mental Models](https://jamesclear.com/mental-models)
- [ModelThinkers](https://modelthinkers.com/)

---

_"You only think you know, as a matter of fact. And most of your actions are based on incomplete knowledge and you really don't know what it is all about, or what the purpose of the world is, or know a great deal of other things. It is possible to live and not know."_
— Richard Feynman
