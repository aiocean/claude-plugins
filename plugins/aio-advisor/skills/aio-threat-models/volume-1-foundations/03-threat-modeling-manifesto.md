# Threat Modeling Manifesto (2020)

> "Threat modeling is analyzing representations of a system to highlight concerns about security and privacy characteristics."
> — Threat Modeling Manifesto (2020)

## Core Concept

A **community consensus document** on threat modeling values, principles, patterns, and anti-patterns. Modeled after the Agile Manifesto (2001). It codifies shared practitioner wisdom without prescribing any specific methodology — deliberately framework-agnostic.

## Origin

Published July 2020 by a working group of **15 signatories** spanning academia, industry, and consulting:

Zoe Braiterman, Adam Shostack, Jonathan Marcil, Stephen de Vries, Irene Michlin, Kim Wuyts, Robert Hurlbut, Brook S.E. Schoenfield, Fraser Scott, Matthew Coles, Chris Romeo, Alyssa Miller, Izar Tarandach, Avi Douglen, Marc French.

Website: https://www.threatmodelingmanifesto.org/

## The Canonical Definition

> *"Threat modeling is analyzing representations of a system to highlight concerns about security and privacy characteristics."*

Three key components:
1. **Analyzing representations** — models (DFD, sequence, state), not the live system
2. **Highlight concerns** — surface risks, not enumerate vulnerabilities
3. **Security AND privacy** — equal billing (departure from security-only past)

## Five Values (X over Y)

Priority to the left; both matter:

1. **Finding and fixing design issues** over checkbox compliance
2. **People and collaboration** over processes, methodologies, and tools
3. A **journey of understanding** over a security or privacy snapshot
4. **Doing threat modeling** over talking about it
5. **Continuous refinement** over a single delivery

## Four Principles

1. Best use of threat modeling is to improve security/privacy via **early and frequent** analysis
2. Threat modeling must **align with development practices** and follow design changes **in iterations**
3. Outcomes are meaningful when **valuable to stakeholders**
4. **Dialog** is key to shared understanding; documents record it and enable measurement

## Recommended Patterns

- **Systematic Approach** — structured, repeatable
- **Informed Creativity** — mix structure with brainstorming
- **Varied Viewpoints** — diverse stakeholder participation
- **Useful Toolkit** — choose appropriate methods per context
- **Theory into Practice** — apply knowledge concretely

## Anti-Patterns to Avoid

- **Hero Threat Modeler** — one scarce security expert bottlenecks everything (direct critique of SDL-era model)
- **Admiration for the Problem** — endless analysis without action
- **Tendency to Overfocus** — over-analyzing one area while ignoring others
- **Perfect Representation** — spending weeks perfecting a DFD that's outdated by next sprint

## When to Use

- **Onboarding** — introduce teams to threat modeling philosophy
- **Charter setting** — align team on what "good" threat modeling looks like
- **Anti-pattern recognition** — diagnose why an existing practice is failing
- As **evaluation criteria** for selecting tools and methodologies

## Significance

- **First community-wide consensus** on threat modeling values — decades of practice, no unified vocabulary before 2020
- Deliberately **methodology-neutral** — doesn't pick STRIDE vs PASTA vs LINDDUN
- **Privacy elevated to equal status with security** — reflects post-GDPR reality
- Hero Threat Modeler anti-pattern validates the shift from **expert-driven** to **developer-driven** threat modeling

## Relation to Other Frameworks

- **Shostack 4 Questions** — Manifesto adopts them verbatim
- **Continuous Threat Modeling** — the "continuous refinement" value directly motivates this approach
- **LINDDUN** — privacy inclusion in definition validates LINDDUN's role as co-equal to STRIDE
- **Agile Manifesto (2001)** — direct structural inspiration

## References

- Threat Modeling Manifesto (2020). https://www.threatmodelingmanifesto.org/
- Shostack blog post announcing the Manifesto (2020). https://shostack.org/blog/
- Signatories' works cited throughout Volumes 2–7 of this knowledge base.
