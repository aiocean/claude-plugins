# Persona non Grata (PnG)

> "Just as UX personas represent legitimate users, a PnG represents a malicious or unintended one."
> — Jane Cleland-Huang, 2014

## Core Concept

An **attacker-persona-based**, **requirements-phase** threat modeling technique. PnG adapts the UX persona methodology to adversarial security contexts. Each PnG is an *archetype* capturing an attacker class's goals, motivations, skills, resources, and modus operandi — making abstract adversary concepts concrete and communicable.

## Origin

**Jane Cleland-Huang** (DePaul University). *"How Well Do You Know Your Personae Non Gratae?"*, **IEEE Software** 31(4):28–31, July/August 2014.

Follow-up crowdsourcing research: Mead, Shull et al. (2017). "Crowd Sourcing the Creation of Personae Non Gratae for Requirements-Phase Threat Modeling".

Cleland-Huang's framing specifically targets the **requirements phase** of SDLC — when security issues are cheapest to address.

## PnG Profile Structure

A PnG profile typically captures:

- **Biography and background** — context explaining capability and access level
- **Goals** — what the attacker seeks against the system
- **Intent** — malicious (deliberate harm) or negligent (accidental misuse)
- **Modus operandi** — stereotypical approach and techniques
- **Resources and sophistication** — tools, time, technical skill, organizational backing
- **Motivation** — ideological, financial, competitive, personal grievance

## Example PnGs

| PnG | Intent | Typical MO |
|---|---|---|
| Disgruntled insider | Malicious | Abuse legitimate access; exfil before termination |
| Script kiddie | Malicious (low sophistication) | Public exploits; low-effort, high-volume |
| Nation-state APT | Malicious (high sophistication) | Custom tooling; long dwell time; strategic targeting |
| Negligent developer | Accidental | Copy-paste credentials into public repos |
| Overzealous marketer | Accidental | Bypass privacy controls for metrics |

## Three-Technique Integration (Cleland-Huang's Approach)

1. **PnG personas** — frame adversarial context
2. **Misuse cases** — specify how the system should respond to adversary actions (counterpart to UML use cases)
3. **Annotated activity diagrams** — trace security concerns (privacy, audit, non-repudiation) through workflows

## When to Use

- **Requirements phase** of new system development
- When communicating with **non-security stakeholders** (PnG is more intuitive than STRIDE)
- **Insider threat** modeling (often missed by purely external-attacker frameworks)
- **Accidental misuse scenarios** (negligent user archetypes)
- **Training exercises** for teams learning threat modeling
- Inside **hTMM Step 3** (threat pruning — reject threats without plausible PnG)

## Strengths

- **Accessible** — no security expertise required to understand a persona
- **Surfaces insider threats** that checklists miss
- **Captures sociotechnical threats** — culture, governance, incentive-driven misuse
- **Lightweight** — a PnG can be written in 1 page
- **Requirements traceability** — misuse cases link directly to functional requirements

## Limitations

- **Quality depends on archetype knowledge** — risk of stereotyping or missing novel attacker classes
- **No formal completeness guarantee** — coverage bounded by PnGs created
- **Can drift into fiction** — detailed personas mask lack of rigor
- **Bias risk** — team's assumptions about "who attacks us" encode cultural biases
- **Not quantitative** — cannot rank threats by impact or probability alone

## Relation to Other Frameworks

- **Security Cards** — similar creative breadth; Cards use structured dimensions, PnG uses narrative archetypes
- **hTMM** — uses PnG as Step 3 pruning filter
- **Attack Trees** — PnG defines *who* the attacker is; Attack Trees decompose *how* they act
- **Use Cases / Misuse Cases** (Sindre & Opdahl 2005) — PnG fits naturally with misuse case modeling
- **UX Personas** — direct methodological inspiration

## References

- Cleland-Huang, J. (2014). "How Well Do You Know Your Personae Non Gratae?". *IEEE Software* 31(4):28–31. https://www.researchgate.net/publication/263128686
- Mead, N., Shull, F. et al. (2017). "Crowd Sourcing the Creation of Personae Non Gratae for Requirements-Phase Threat Modeling". IEEE.
- Sindre, G., Opdahl, A. (2005). "Eliciting security requirements with misuse cases". *Requirements Engineering* 10:34–44.
