# Diamond Model of Intrusion Analysis

> "The first formal method applying scientific principles to intrusion analysis — particularly measurement, testability, and repeatability."
> — Caltagirone, Pendergast, Betz (2013)

## Core Concept

An **analyst-centric framework** establishing the atomic unit of intrusion analysis as an **event** with four core features arranged as vertices of a diamond: **Adversary, Capability, Infrastructure, Victim**. The Diamond Model enables hypothesis-driven CTI analysis, attribution reasoning, and campaign tracking via **activity threading**.

## Origin

**Sergio Caltagirone, Andrew Pendergast, Christopher Betz** — U.S. Department of Defense technical report, 2013.

- DTIC ADA586960: https://apps.dtic.mil/sti/citations/ADA586960
- Full PDF: https://www.activeresponse.org/wp-content/uploads/2013/07/diamond.pdf

## Four Core Features (Diamond Vertices)

| Vertex | Definition |
|---|---|
| **Adversary** | Individuals, groups, or organizations conducting the intrusion — motive, intent, resources |
| **Capability** | TTPs employed — tools, malware, exploitation methods |
| **Infrastructure** | Systems/networks delivering capability — C2 servers, staging hosts, communication channels |
| **Victim** | Targeted entity — analyzed to understand targeting rationale |

## Meta-Features (Extending the Diamond)

### Two Axes Connecting Vertices

- **Socio-Political axis**: Adversary ↔ Victim — encodes relationship (nation-state espionage, financial crime, hacktivism). Enables geopolitical attribution.
- **Technology axis**: Capability ↔ Infrastructure — encodes technical implementation (protocols, encryption, channels).

### Event Meta-Features

- **Timestamp**
- **Phase** (often maps to Kill Chain/UKC phase)
- **Result**
- **Direction**
- **Methodology**
- **Resources**

## Activity Threading

The model's most powerful feature: **activity threads** link discrete events into coherent campaigns via **Activity-Attack Graphs**. Six documented steps enable reproducible Activity Group creation, supporting hypothesis validation across intrusions attributed to the same actor.

## When to Use

- **CTI analyst workflows** — structured intrusion analysis
- **Attribution reasoning** — rigorous adversary identification
- **Campaign tracking** — linking multiple incidents
- **Intelligence sharing** — common vocabulary for events
- **APT analysis** — multi-year campaigns where threading matters
- **Research publications** — academic rigor for CTI writeups

## Strengths

- **First formal scientific method** for intrusion analysis (per authors' claim)
- **Measurable, testable, repeatable** — supports hypothesis-driven analysis
- **Activity Threading** enables campaign coherence analysis
- **Technology + Socio-Political axes** encode rich context
- **Fourth-generation warfare applicability** — beyond pure technical analysis

## Limitations

- **Analytical framework only** — does not prescribe defensive countermeasures
- **Requires trained CTI practitioners** — steeper learning curve than Kill Chain
- **Low value in developer-facing** secure design contexts (use STRIDE/PASTA instead)
- **Attribution uncertainty** — all four vertices have measurement difficulty
- **Socio-Political axis is subjective** — geopolitical framing has biases

## Relation to Other Frameworks

- **Kill Chain / UKC** — Diamond events often tagged with Kill Chain phase as meta-feature
- **MITRE ATT&CK** — Capability vertex populated by ATT&CK techniques
- **CAPEC** — alternative Capability population source
- **STIX/TAXII** — Diamond Model aligns with STIX SDO (STIX Domain Object) taxonomy
- **Mandiant / CrowdStrike threat actor taxonomies** — Adversary vertex populated by industry group IDs (APT28, FIN7, etc.)

## References

- Caltagirone, S., Pendergast, A., Betz, C. (2013). *The Diamond Model of Intrusion Analysis*. DoD / DTIC ADA586960. https://apps.dtic.mil/sti/citations/ADA586960
- Full PDF: https://www.activeresponse.org/wp-content/uploads/2013/07/diamond.pdf
- ThreatConnect Diamond Model primer: https://threatconnect.com/blog/the-diamond-model-of-intrusion-analysis/
