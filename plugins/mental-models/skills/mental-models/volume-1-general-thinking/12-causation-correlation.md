# Causation vs Correlation

> "Correlation does not imply causation."
> — Statistics 101

## Core Concept

**Correlation** means two things tend to occur together. **Causation** means one thing actually causes the other. These are fundamentally different, but our brains constantly confuse them.

Just because A and B appear together doesn't mean A causes B, B causes A, or that they're related at all beyond coincidence.

## The Fundamental Truth

Our brains are pattern-recognition machines. We see two things happening together and immediately assume a causal relationship. This was useful for survival ("eat that berry, get sick → don't eat that berry") but creates endless false beliefs in complex modern contexts.

**The Trap:**
- Ice cream sales and drowning deaths are correlated
- Ice cream doesn't cause drowning
- Both are caused by summer (hot weather)

## Three Possible Relationships

When A and B correlate:

```
1. A causes B          A ──────────> B

2. B causes A          A <────────── B

3. C causes both       A <───── C ─────> B
   (confounding)              ↓
                      (Hidden variable)

4. Pure coincidence    A      B
                     (No real relationship)
```

## Classic Examples

### Spurious Correlations

| Correlation | Actual Relationship |
|-------------|---------------------|
| Ice cream sales ↔ Drowning deaths | Both caused by summer |
| Shoe size ↔ Reading ability | Both caused by age (in children) |
| Nicolas Cage films ↔ Pool drownings | Pure coincidence |
| Firefighters at scene ↔ Fire damage | Both effects of fire size |
| Hospital visits ↔ Death | Sick people go to hospitals |

### Reversed Causation

| Apparent Causation | Actual Direction |
|--------------------|------------------|
| "Happy people exercise" | Exercise may cause happiness, not reverse |
| "Successful people read" | Success provides time/resources to read |
| "Vaccinated kids have autism" | Both affected by access to healthcare |

### Confounding Variables

| A and B Correlate | Hidden Cause C |
|-------------------|---------------|
| Education ↔ Income | Family wealth, intelligence |
| Marriage ↔ Happiness | Personality traits |
| Coffee ↔ Productivity | Work culture, stress |

## Why This Error Is So Common

### 1. Our Brains Seek Patterns
We evolved to find causal relationships quickly. Better to assume the rustle in the bushes is a predator (false positive) than ignore a real threat (false negative).

### 2. Anecdotes Are Persuasive
"I took this supplement and got better" feels like proof. But without a control group, you can't distinguish causation from coincidence or placebo.

### 3. Post Hoc Reasoning
"B happened after A, so A caused B." This is a logical fallacy. Sequence doesn't prove causation.

### 4. Confirmation Bias
We remember when A and B occurred together but forget when they didn't.

## How to Test for Causation

### The Gold Standard: Randomized Controlled Trial

1. Randomly assign subjects to treatment or control group
2. Apply treatment only to treatment group
3. Measure difference in outcomes
4. If significant difference → likely causation

### Bradford Hill Criteria (For Observational Data)

When experiments are impossible, consider:

1. **Strength:** Larger correlations are more likely causal
2. **Consistency:** Effect seen across different studies/contexts
3. **Specificity:** A leads specifically to B, not everything
4. **Temporality:** A must precede B
5. **Dose-response:** More A → More B
6. **Plausibility:** Mechanism makes biological/logical sense
7. **Coherence:** Doesn't conflict with known facts
8. **Experiment:** Any experimental support?
9. **Analogy:** Similar relationships exist elsewhere

## Practical Application

### In Business

**Correlation:** Companies with ping pong tables perform better.
**Causation?** No. Successful companies can afford perks. Perks don't cause success.

**What to do:** Ask "What actually causes the outcome?" not "What correlates with it?"

### In Health

**Correlation:** People who eat breakfast are healthier.
**Causation?** Unclear. Health-conscious people may eat breakfast AND exercise, sleep well, etc.

**What to do:** Look for randomized trials, not observational studies.

### In Marketing

**Correlation:** Customers who use feature X spend more.
**Causation?** Maybe not. Power users discover feature X AND spend more—both effects of engagement.

**What to do:** Run A/B tests where possible.

### In Hiring

**Correlation:** Our successful employees went to top schools.
**Causation?** Selective schools may simply identify pre-existing talent, not create it.

**What to do:** Define success criteria and test assumptions.

## Regression to the Mean

A special case of causation-correlation confusion.

**Example:** Sports team performs terribly, hires new coach, performs better.

**Interpretation:** "The new coach caused improvement!"

**Reality:** Extremely bad performance is often followed by less extreme performance—regardless of changes. This is regression to the mean.

**Implication:** After extreme results (good or bad), expect movement toward average. Don't attribute normal variation to whatever intervention happened between.

## Questions to Ask

When you see a correlation, ask:

1. **Could A cause B?**
   - Is there a plausible mechanism?

2. **Could B cause A?**
   - Is the direction reversed?

3. **Could C cause both?**
   - What hidden variables might explain both?

4. **Is it just coincidence?**
   - With enough data, spurious correlations are inevitable

5. **What does experimentation show?**
   - Has anyone tested this with proper controls?

## The XKCD Rule

There's a famous XKCD comic about correlation:

> "Correlation doesn't imply causation, but it does waggle its eyebrows suggestively and gesture furtively while mouthing 'look over there.'"

Correlation IS a clue worth investigating. It's just not proof.

## Common Mistakes to Avoid

### 1. Dismissing All Correlations
Correlation doesn't prove causation, but it often hints at something worth exploring. Don't throw out the data—investigate deeper.

### 2. Accepting Correlations as Proof
Just because two things appear together doesn't mean you understand why.

### 3. Ignoring Reverse Causation
Always ask: "Could B cause A instead?"

### 4. Forgetting Time-Based Correlation
Things that both increase over time (like global temperature and number of pirates) will correlate even with no relationship.

### 5. Small Sample Size
With few data points, random correlations are common and meaningless.

## Business/Life Heuristics

**When making decisions based on data:**

1. Correlation is a starting point, not an answer
2. Ask about mechanism: HOW would A cause B?
3. Look for natural experiments
4. Run your own experiments when possible
5. Consider multiple explanations
6. Be extra skeptical when the claim benefits the claimant

**When evaluating claims:**

- "Studies show X is correlated with Y" → Interesting, but doesn't prove causation
- "Randomized controlled trials show X causes Y" → Much stronger evidence
- "Everyone knows X causes Y" → Be skeptical; common beliefs are often wrong

## Key Takeaways

1. **Correlation ≠ Causation** - The core principle
2. **Consider all directions** - A→B, B→A, C→both, coincidence
3. **Look for hidden variables** - What else might explain both?
4. **Demand experiments** - Randomized trials are the gold standard
5. **Regression to the mean** - Extreme results naturally moderate

## The Practical Takeaway

When you see data showing two things correlate:

**Don't:** "A causes B!"
**Do:** "A and B are associated. What might explain this? How could we test it?"

## Related Models

- **Occam's Razor** - Simple explanations before complex causation claims
- **Falsifiability** - Can we test the causal claim?
- **First Principles** - What mechanism would connect A and B?

---

*"The world is full of obvious things which nobody by any chance ever observes."*
— Sherlock Holmes
