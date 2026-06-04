# Attack Trees

> "When fully valued, attack trees reveal that breaking RSA is not the cheapest attack on PGP email — Trojan screen capture and passphrase theft are."
> — Bruce Schneier's famous PGP example (1999)

## Core Concept

A **representation formalism**, not a full methodology. Attack trees model threats as hierarchical decompositions of attacker goals. The **root** is the adversary's high-level goal; **leaves** are basic attack steps; **internal nodes** are AND (all children needed) or OR (any child suffices). Attributes like cost, probability, and skill requirement propagate through the tree.

## Origin

**Bruce Schneier**, *"Attack Trees: Modeling Security Threats"*, *Dr. Dobb's Journal of Software Tools* 24(12):21–29, December 1999.

Canonical URLs:
- https://www.schneier.com/academic/archives/1999/12/attack_trees.html
- https://www.schneier.com/wp-content/uploads/2015/12/attacktrees.pdf

Schneier adapted the concept from **Fault Trees** (safety engineering, 1960s) — same propagation semantics, different intent (adversarial vs accidental).

## Structure

- **Root node**: attacker's goal (e.g., "Open Safe", "Read encrypted email")
- **Leaf nodes**: basic, indivisible attack steps
- **Internal nodes**: AND or OR

### Semantic Rules

**OR node** — possible if any child possible; lowest cost wins:
- Boolean: OR → possible if any child possible
- Continuous (cost, time): OR → **min** of children

**AND node** — requires all children; cost sums:
- Boolean: AND → possible only if all children possible
- Continuous: AND → **sum** of children

## Attribute Assignment

Each leaf can carry multiple attribute types:

**Boolean**: possible/impossible, easy/difficult, legal/illegal, intrusive/non-intrusive

**Continuous**: cost ($), probability of success (0–1), time required (hours), equipment required (specialized/commodity)

## The Schneier PGP Example

Schneier's canonical example: attacking encrypted PGP email. Goal = "Read target's email".

OR-branches include:
- Break PGP crypto (cost: $1M+; probability: near zero)
- Compromise target's machine with Trojan (cost: $10K; probability: 0.9)
- Steal passphrase via keylogger (cost: $1K; probability: 0.8)
- Social engineering (cost: $500; probability: 0.5)

Fully-valued tree reveals: **Trojan/keylogger/social eng dominate RSA attacks by 3 orders of magnitude** on cost-efficiency.

## When to Use

- **High-value attack scenario analysis** — specific "what if attacker targets X?"
- **Quantitative comparison** of attack paths (cost/probability/time)
- **Embedded inside other methodologies** — PASTA Stage 6, OCTAVE threat profiles
- **Red team exercise planning** — enumerating attack paths to test
- **Countermeasure ROI analysis** — which mitigations collapse the most attack paths

## Strengths

- **Compositional** — subtrees reuse across different systems
- **Quantitative analysis** — unique among threat modeling tools
- **Intuitive visual** representation
- **Attacker-goal-centric** — naturally generates adversarial scenarios
- **Language-neutral** — independent of implementation details

## Limitations

- **No cycles** — trees can't represent shared sub-goals; requires extension to Attack DAGs or Attack Graphs
- **No standard leaf probability source** — values often guesses
- **Requires attacker knowledge** — novices generate shallow trees
- **Combinatorial explosion** — complex systems produce unanalyzable trees
- **Not a complete methodology** — need Shostack 4Q or PASTA wrapper

## Relation to Other Frameworks

- **Fault Trees (safety eng)** — Attack Trees inherited OR/AND semantics
- **PASTA Stage 6** — explicit attack tree construction step
- **Attack Graphs** (research) — generalization to DAGs
- **MITRE ATT&CK** — can populate leaf nodes from ATT&CK techniques
- **Kill Chain / UKC** — chains of attack tree operations form kill chain instances

## References

- Schneier, B. (1999). "Attack Trees: Modeling Security Threats". *Dr. Dobb's Journal* 24(12):21–29. https://www.schneier.com/wp-content/uploads/2015/12/attacktrees.pdf
- Schneier, B. *Secrets and Lies: Digital Security in a Networked World* (Wiley, 2000) — extended treatment.
- Kordy, B., Piètre-Cambacédès, L., Schweitzer, P. (2014). "DAG-based attack and defense modeling: Don't miss the forest for the attack trees". *Computer Science Review* 13-14:1-38.
