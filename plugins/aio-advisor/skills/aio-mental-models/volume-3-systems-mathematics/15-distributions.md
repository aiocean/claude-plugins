# Distributions

> "How things are spread tells you more than averages ever could."

## Core Concept

A **Distribution** describes how values are spread across a range. Understanding distributions prevents the errors of assuming everything is "average" and reveals the true shape of reality.

The same average can hide vastly different realities.

## Why Averages Mislead

**Same average, different distributions:**

| Company A | Company B |
|-----------|-----------|
| Employees: $50k, $50k, $50k, $50k, $50k | Employees: $10k, $10k, $10k, $10k, $210k |
| Average: $50k | Average: $50k |
| Reality: Equal pay | Reality: Huge inequality |

**The joke:** "The average person has one testicle and one breast."

Averages can be mathematically correct but practically meaningless.

## Common Distributions

### Normal Distribution (Bell Curve)

```
      ╭───────╮
     ╱         ╲
    ╱           ╲
   ╱             ╲
──╱───────────────╲──
```

**Characteristics:**
- Most values cluster around the mean
- Symmetric tails
- Predictable outliers
- 68% within 1 standard deviation

**Examples:**
- Human height
- Test scores
- Measurement error
- IQ

**Key insight:** Extremes are rare and bounded.

### Power Law Distribution

```
│
│
│╲
│ ╲
│  ╲
│   ╲
│    ╲__________
└─────────────────
```

**Characteristics:**
- Few extreme values, many small values
- Long tail
- Unbounded extremes possible
- Average is misleading

**Examples:**
- Wealth distribution
- City sizes
- Website traffic
- Book sales

**Key insight:** The "average" is rare; most are below it, few are far above.

### Bimodal Distribution

```
    ╭───╮    ╭───╮
   ╱     ╲  ╱     ╲
  ╱       ╲╱       ╲
─╱─────────────────╲─
```

**Characteristics:**
- Two peaks (modes)
- Average falls in the valley
- Two distinct groups

**Examples:**
- Mixed populations (tall + short species)
- Skill distribution (beginners + experts)
- Polarized opinions

**Key insight:** There may be no "typical" case; average represents no one.

### Uniform Distribution

```
┌─────────────────────┐
│                     │
│                     │
└─────────────────────┘
```

**Characteristics:**
- All values equally likely
- No clustering
- No typical case

**Examples:**
- Rolling a fair die
- Random number generators (designed)
- Some lottery systems

**Key insight:** Every value is as likely as any other.

## Fat Tails vs Thin Tails

### Thin Tails (Normal)

Extreme events are:
- Very rare
- Bounded
- Predictable from history
- Not system-threatening

**Example:** Human height variation

### Fat Tails (Power Law)

Extreme events are:
- More common than expected
- Unbounded
- Not predictable from history
- Can be system-threatening

**Example:** Market crashes, pandemics, earthquakes

**Key difference:** In fat-tailed domains, the worst case is much worse than history suggests.

## Implications for Decision-Making

### 1. Know Which Distribution Applies

| Domain | Likely Distribution |
|--------|-------------------|
| Physical measurements | Normal |
| Wealth, success | Power law |
| Performance + luck | Mixed |
| Creative output | Power law |
| Biological attributes | Normal |

### 2. Don't Use Average When Distribution Matters

**Wrong:** "Average income is $50k, so most people earn near $50k"
**Right:** Understand the full distribution

### 3. In Fat-Tailed Domains, Prepare for Extremes

Normal statistics don't apply:
- Historical maximum may not be true maximum
- "10-sigma events" happen more often
- Margin of safety must be much larger

### 4. Understand Variance, Not Just Mean

**Same mean, different variance:**
- Consistent performer: 100, 100, 100, 100 (mean 100, low variance)
- Volatile performer: 0, 200, 50, 150 (mean 100, high variance)

Which is better depends on context.

## The Distribution Questions

### Before Making Decisions

1. What's the average?
2. What's the distribution?
3. What's the variance?
4. How extreme can outliers be?
5. Is this normal or fat-tailed?

### Common Errors to Avoid

- Assuming normal distribution when it's power law
- Using average without understanding spread
- Ignoring the possibility of extreme events
- Treating thin-tailed history as fat-tailed predictor

## Practical Applications

### Investing

Fat-tailed domain:
- Extreme gains AND losses are more likely than statistics suggest
- Diversify heavily
- Don't bet everything on historical norms

### Hiring

Often bimodal or power law:
- Top performers may be 10x better
- "Average" candidates may be rare
- Look for the distribution, not just average

### Project Planning

Often skewed:
- Best case is bounded
- Worst case can be very bad
- Median ≠ Mean ≠ Most likely

### Risk Management

Depends on tail thickness:
- Normal domain: Historical worst case is reasonable guide
- Fat-tailed domain: Worst case could be much worse

## Key Takeaways

1. **Distributions > Averages** - The spread matters more than the center
2. **Know your domain** - Normal vs power law vs other
3. **Fat tails matter** - Extreme events more likely than intuition suggests
4. **Same mean, different reality** - Variance and shape reveal truth
5. **Bimodal = No typical** - Average may represent no one

## The Distribution Questions

- **"What's the shape of this distribution?"**
- **"Is this thin-tailed or fat-tailed?"**
- **"What does the average hide?"**
- **"How extreme could outliers be?"**

## Related Models

- **Power Laws** - One important distribution type
- **Margin of Safety** - Especially important in fat-tailed domains
- **Regression to Mean** - How extreme values behave

---

*"The average human has one breast and one testicle. Statistics, like bikinis, can be revealing but hide the essential."*
