# Lockheed Martin Cyber Kill Chain

> "Disruption at the earliest phase is far more cost-effective than detection after exploitation."
> — Kill Chain defensive principle

## Core Concept

An **attacker-centric**, **campaign-level** intrusion model describing how Advanced Persistent Threats (APTs) progress through seven sequential phases. Designed to enable **intelligence-driven defense** — disrupting attacks early (reconnaissance, weaponization) rather than detecting them late (data exfiltration). Legitimized **campaign analysis** as a CTI discipline.

## Origin

**Eric M. Hutchins, Michael J. Cloppert, Rohan M. Amin** — Lockheed Martin, 2011.

Paper: *"Intelligence-Driven Computer Network Defense Informed by Analysis of Adversary Campaigns and Intrusion Kill Chains"*, *Leading Issues in Information Warfare & Security Research* 1(1):80.

PDF: https://www.lockheedmartin.com/content/dam/lockheed-martin/rms/documents/cyber/LM-White-Paper-Intel-Driven-Defense.pdf

## The Seven Phases

| # | Phase | Adversary Activity | Defender Opportunity |
|---|---|---|---|
| 1 | **Reconnaissance** | Research target (OSINT, scanning) | Detection, intel sharing |
| 2 | **Weaponization** | Couple exploit with payload | Blocklist known tools |
| 3 | **Delivery** | Transmit weaponized bundle (email, web, USB) | Email filtering, web proxies |
| 4 | **Exploitation** | Trigger code on target | Patching, EDR |
| 5 | **Installation** | Install persistent malware | HIDS, app whitelisting |
| 6 | **Command and Control** | Establish control channel | Network egress filtering, DNS monitoring |
| 7 | **Actions on Objectives** | Exfil, destroy, modify | DLP, network segmentation |

## Defensive Principle

The model emphasizes **asymmetry**: defenders need to break the chain at *only one* phase to disrupt the attack, while attackers must succeed at *all seven*. This inverts the usual "defenders must be right every time, attackers only once" framing for APT contexts.

## When to Use

- **APT / nation-state threat** contexts (original design target)
- **SOC / CTI programs** — phase-based detection engineering
- **Incident response timelines** — map each IOC to a phase
- **Intel sharing** — common vocabulary across organizations
- **Security investment prioritization** — coverage gaps per phase

## Strengths

- **Industry-standard vocabulary** — universally understood in CTI circles
- **Early-disruption principle** — mathematically sound defensive strategy
- **Enables campaign analysis** — links multiple incidents to persistent adversary
- **Well-documented** — extensive secondary literature

## Critiques and Limitations

- **Perimeter bias** — designed for external malware delivery; cloud/API attacks don't fit
- **APT-centric** — insider threats bypass phases 1–3 entirely
- **Linear progression assumption** — empirical data shows ~90% of attacks compress or reorder early phases
- **Low post-access granularity** — lateral movement, privilege escalation, defense evasion all collapse into "Actions on Objectives"
- **Doesn't cover ransomware economy** well — modern attack patterns differ
- **Missing social engineering** as a named phase

## Relation to Other Frameworks

- **Unified Kill Chain (UKC)** — expands to 18 stages addressing critiques
- **MITRE ATT&CK** — provides TTP-level detail Kill Chain lacks
- **Diamond Model** — complementary CTI framework; event-centric
- **NIST Cybersecurity Framework** — Kill Chain phases map to Detect/Respond functions
- **CAPEC** — attack pattern catalog populating individual phases

## References

- Hutchins, E.M., Cloppert, M.J., Amin, R.M. (2011). *Intelligence-Driven Computer Network Defense*. Lockheed Martin. https://www.lockheedmartin.com/content/dam/lockheed-martin/rms/documents/cyber/LM-White-Paper-Intel-Driven-Defense.pdf
- Lockheed Martin Cyber Kill Chain page: https://www.lockheedmartin.com/en-us/capabilities/cyber/cyber-kill-chain.html
