# Trike

> "Threats are deviations from requirements. If it's not in the requirements, it's not a threat."
> — Trike methodology principle

## Core Concept

A **requirements-based**, **defender's-perspective** threat modeling framework. Trike encodes legitimate system behavior as a formal **actor-asset-action matrix**; any state enabling a disallowed action, or blocking an allowed action, is a threat. Often miscategorized as attacker-centric — it is more accurately **risk-management-centric from the defender's standpoint**.

## Origin

**Paul Saitta, Brenda Larcom, Michael Eddington**, 2005. *Trike v.1 Methodology Document [Draft]*. Presented at Help Net Security 2005. **The v1 document remains a draft** — Trike never achieved a complete formal release.

Project: https://trike.sourceforge.net/papers/
PDF: https://img2.helpnetsecurity.com/dl/articles/Trike_v1_Methodology_Document-draft.pdf

## The Three Models

### 1. Requirements Model (primary artifact)

An **actor × asset** matrix. Each cell is divided into 4 quadrants representing CRUD operations:
- **C**reate
- **R**ead
- **U**pdate
- **D**elete

Each quadrant gets one of three values:
- **Allowed**
- **Disallowed**
- **Conditional** (with rules specifying conditions)

This matrix formally encodes *legitimate* system behavior — the baseline against which threats are measured.

### 2. Implementation Model

Maps the requirements matrix onto actual system architecture (DFDs) to identify where implementation diverges from requirements.

### 3. Risk Model

Evaluates threats against actor-asset-action triplets. Threats are classified into just **two types**:
- **Elevation of Privilege** — attacker achieves disallowed action
- **Denial of Service** — attacker blocks allowed action

## Distinctive Feature

Threats are **not from a checklist** (unlike STRIDE). They are **derived systematically** from the requirements matrix. Any state enabling disallowed, or blocking allowed, is a threat — by construction.

## When to Use

- **Requirements engineering teams** with formal discipline
- **Security auditors** wanting repeatable, requirements-driven analysis
- Systems where **access control** is the primary threat concern
- Academic / research contexts
- When a **high-formalism** approach is preferred

## Strengths

- **Requirements-grounded** — reduces subjective threat identification
- **Formalizable** — potentially automatable
- **Clear defensive framing** useful for security audits
- **CRUD-based completeness** — every action in every cell gets considered

## Limitations

- **Draft status** — v1 document never finalized; no authoritative reference exists
- **CRUD is too coarse** for complex permission models (RBAC hierarchies, ABAC, delegated permissions)
- **Narrow threat taxonomy** — only EoP + DoS; misses repudiation, privacy, side-channel threats
- **Limited tooling** compared to STRIDE/PASTA
- **Low community adoption** — small practitioner base
- Empirical validation absent

## Relation to Other Frameworks

- **STRIDE** — Trike is requirements-first; STRIDE is element-first
- **PASTA** — both risk-centric; PASTA layers business risk on top
- **OCTAVE** — both asset-aware; Trike is more formal/technical, OCTAVE is organizational
- **Access control models (RBAC, ABAC)** — Trike's CRUD matrix aligns naturally with RBAC analysis
- **Formal methods (Alloy, TLA+)** — Trike's formal nature invites FM verification

## References

- Saitta, P., Larcom, B., Eddington, M. (2005). *Trike v.1 Methodology Document [Draft]*. https://trike.sourceforge.net/papers/
- Semantic Scholar: https://www.semanticscholar.org/paper/Trike-v.1-Methodology-Document-%5BDraft%5D-Saitta-Larcom/672cd629fd6c9324e32a4c9e2b5ce5231123aa84
- Shevchenko, N. (2018). *Threat Modeling: 12 Available Methods*. CMU/SEI blog.
