# Scaling

> "What works at one scale doesn't necessarily work at another."

## Core Concept

**Scaling** is how systems change as they grow or shrink in size. Properties don't scale linearly—some things get easier at scale, others get harder, and some break entirely.

Understanding scaling helps you predict what will happen as things grow and avoid surprises.

## The Fundamental Truth

Scale changes everything:
- What works for 10 customers may not work for 10,000
- What works for a 5-person team may not work for 500
- What works for $100,000 may not work for $100,000,000

## Scaling Properties

### Some Things Scale Well

**Examples that get easier with scale:**
- Per-unit costs often decrease (economies of scale)
- Network effects strengthen (more users = more value)
- Brand recognition compounds
- Fixed costs spread over more units

### Some Things Scale Poorly

**Examples that get harder with scale:**
- Communication complexity (n² problem)
- Coordination costs
- Quality control
- Cultural cohesion
- Speed and agility

### Some Things Break at Scale

**Examples that don't transfer:**
- Personal relationships can't scale (Dunbar's number)
- Founder involvement in everything
- Informal processes
- Tribal knowledge

## Mathematical Scaling

### Linear Scaling (y = x)
Double input → Double output
- Simple production
- Basic resources

### Sublinear Scaling (y = x^0.8)
Double input → Less than double output
- Infrastructure (you can serve more with less per unit)
- Cities (larger cities are more efficient per capita)

### Superlinear Scaling (y = x^1.2)
Double input → More than double output
- Network effects
- Innovation in cities
- Some viral effects

### Breaking Point Scaling
Works until a threshold, then fails:
- Team size (small teams agile, large teams bureaucratic)
- Database performance (works until it doesn't)

## Where Scaling Matters

### Team Scaling

| Team Size | What Changes |
|-----------|--------------|
| 2-5 | Direct communication, implicit understanding |
| 6-15 | Need some structure, communication overhead grows |
| 16-50 | Need explicit processes, subteams emerge |
| 51-150 | Departments, hierarchy, formal communication |
| 150+ | Bureaucracy, culture challenges, silos |

**The n² problem:** Communication paths = n(n-1)/2
- 5 people = 10 paths
- 10 people = 45 paths
- 50 people = 1,225 paths

### Company Scaling

| Stage | Key Challenges |
|-------|----------------|
| 1-10 people | Finding product-market fit |
| 10-50 | Building team, early processes |
| 50-200 | Scaling culture, management layer |
| 200-500 | Specialization, silos, communication |
| 500+ | Bureaucracy, innovation slowdown |

### Technology Scaling

| Scale | What Breaks |
|-------|-------------|
| 100 users | Usually nothing |
| 10,000 users | Database queries, simple architecture |
| 1,000,000 users | Caching, distribution, complexity |
| 100,000,000 users | Everything requires rethinking |

## Scaling Strategies

### Build for Current Scale + Buffer

Don't over-engineer for scale you don't have:
- Premature optimization is waste
- Build for 10x current needs
- Redesign when approaching limits

### Identify What Won't Scale

Explicitly acknowledge what breaks:
- Founder doing sales won't scale
- Manual processes won't scale
- Personal relationships with all customers won't scale

Plan transitions before you're forced to.

### Introduce Structure Appropriately

Add structure as scale demands:
- Too early = bureaucratic overhead
- Too late = chaos and breakdown
- Just right = enough process to function

### Design for Horizontal Scaling

When possible, design systems that scale by adding more:
- More servers (not bigger servers)
- More teams (not bigger teams)
- More products (not more features)

## Inverse Scaling

Sometimes smaller is better:
- Small teams move faster
- Small codebases are more maintainable
- Small companies are more agile
- Small scope is more achievable

**Question:** Is scaling actually the goal, or is effectiveness at current scale better?

## Scaling Challenges

### 1. Losing What Made You Successful

The things that worked when small often can't scale:
- Founder magic
- Cultural cohesion
- Informal communication
- Speed and flexibility

### 2. Complexity Explosion

Complexity grows faster than size:
- More dependencies
- More edge cases
- More coordination
- More things that can break

### 3. Talent Dilution

Early team is special:
- Hiring gets harder at scale
- Average quality often decreases
- Culture carriers become minority

### 4. Decision-Making Slowdown

More stakeholders, more politics:
- More people to consult
- More interests to balance
- More meetings, more delays

## Questions to Ask When Scaling

1. **What works now that won't work at 10x scale?**
2. **What processes need to change?**
3. **What roles need to be different?**
4. **What technology needs to evolve?**
5. **What cultural elements must be preserved?**

## Key Takeaways

1. **Scale changes everything** - Don't assume things transfer
2. **Not everything should scale** - Some things work best small
3. **Plan transitions** - Know when current approaches will break
4. **Add structure appropriately** - Not too early, not too late
5. **Scaling has costs** - Complexity, speed, culture all suffer

## The Scaling Questions

- **"At what scale does this break?"**
- **"What works now that won't work at 10x?"**
- **"Should we scale this, or keep it small?"**
- **"What structure do we need at this scale?"**

## Related Models

- **Bottlenecks** - Constraints that limit scaling
- **Emergence** - New properties at larger scales
- **Gall's Law** - Complex systems from simple ones

---

*"Scaling a startup is like replacing every component of a plane while keeping it in the air."*
