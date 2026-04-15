# hTMM — Hybrid Threat Modeling Method

> "No single method is optimal across all desired properties."
> — SEI 2016 comparative study motivating hTMM

## Core Concept

A **hybrid composition** of three existing techniques: **SQUARE** (requirements engineering) + **Security Cards** (creative threat generation) + **Persona non Grata** (realism filter). Developed by CMU/SEI to address the empirical finding that no individual method simultaneously achieves low false positives, low false negatives, cross-practitioner consistency, and cost-effectiveness.

## Origin

**Nancy R. Mead & Forrest Shull**, Carnegie Mellon University Software Engineering Institute, 2018. *A Hybrid Threat Modeling Method*, CMU/SEI-2018-TN-002 (April 2018).

SEI blog: https://www.sei.cmu.edu/blog/the-hybrid-threat-modeling-method/
Library entry: https://resources.sei.cmu.edu/library/asset-view.cfm?AssetID=516617

## Design Rationale

A 2016 SEI study compared STRIDE, Security Cards, and Persona non Grata. Findings:

- **STRIDE**: good consistency; missed creative threats (false negatives)
- **Security Cards**: excellent creativity; lacked formal structure; high false positives
- **Persona non Grata**: good realism filter; no completeness guarantee

Conclusion: **compose, don't choose**. hTMM substitutes **SQUARE** (Security Quality Requirements Engineering, SEI) for STRIDE, gaining requirements-phase integration.

## The 5 Steps

### Step 1 — System Identification

Execute initial **SQUARE** steps: definitions, business goals, asset identification, security requirements. Output: requirements-grounded system scope.

### Step 2 — Threat Generation

Apply **Security Cards** with a diverse stakeholder group (users + engineers + security specialists). The 4 dimensions (Motivations, Resources, Methods, Human Impact) stimulate creative threat identification. Output: broad threat list, including unlikely-but-plausible threats.

### Step 3 — Threat Pruning

Apply **Persona non Grata** filter. For each generated threat, ask: *does a plausible attacker archetype exist that would pursue this?* If no realistic PnG exists, prune. Output: reduced false-positive threat set.

### Step 4 — Results Documentation

Categorize surviving threats by structured template:
- Actor
- Purpose
- Target
- Action
- Result
- Impact severity
- Threat type

### Step 5 — Risk Assessment

Feed documented threats into formal risk framework (continuation of SQUARE, or external: FAIR, NIST SP 800-30, OCTAVE Allegro risk scoring).

## Component Roles

| Component | Contribution |
|---|---|
| SQUARE | Requirements-phase structure, traceability |
| Security Cards | Breadth, creative stimulation |
| PnG | Realism filter, false-positive reduction |

## When to Use

- **Requirements-phase** threat modeling for new systems
- When both **completeness** and **false-positive reduction** matter
- **Academic / research** contexts with formal validation requirements
- Teams already using **SQUARE** for security requirements
- **Greenfield projects** with time for thorough requirements engineering

## Strengths

- **Composes strengths** of three validated techniques
- **SEI-backed** academic rigor
- **Balances creativity and realism** — Cards expand, PnG contracts
- **Requirements-traceable** — threats link to SQUARE requirements
- **Stakeholder-inclusive** — Step 2 mandates diverse participation

## Limitations

- **Only pilot studies** as of 2018 — large-scale empirical validation incomplete
- **Inherits SQUARE complexity** — non-trivial for teams without requirements engineering background
- **Time-intensive** — 5 steps with stakeholder workshops
- **Step 2 depends on stakeholder diversity** — homogeneous team reduces benefit
- **Limited tooling** — mostly manual process

## Relation to Other Frameworks

- **STRIDE** — hTMM's authors deliberately substituted SQUARE for STRIDE
- **Security Cards** — Step 2 core engine
- **Persona non Grata** — Step 3 filter
- **SQUARE** (SEI) — Steps 1 and 5 scaffold
- **Shostack 4Q** — hTMM is an elaborate instantiation of Q1 (SQUARE) + Q2 (Cards + PnG) + Q3 (Documentation) + Q4 (Risk assessment)

## References

- Mead, N.R., Shull, F. (2018). *A Hybrid Threat Modeling Method*. CMU/SEI-2018-TN-002.
- SEI blog: https://www.sei.cmu.edu/blog/the-hybrid-threat-modeling-method/
- SEI library: https://resources.sei.cmu.edu/library/asset-view.cfm?AssetID=516617
- Mead, N., Stehney, T. (2005). *Security Quality Requirements Engineering (SQUARE) Methodology*. CMU/SEI.
