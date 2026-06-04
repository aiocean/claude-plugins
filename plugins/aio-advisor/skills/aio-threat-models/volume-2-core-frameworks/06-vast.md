# VAST — Visual, Agile, Simple Threat modeling

> "Threat modeling must scale across enterprise DevOps — one diagram can't serve both developers and SOC."
> — VAST dual-track rationale

## Core Concept

A **proprietary, enterprise-scale, DevSecOps-integrated** threat modeling methodology built on three pillars: **Automation**, **Integration** (CI/CD), **Collaboration** (dev + security). VAST's distinctive feature is the **dual-track model** — running separate application and operational threat models in parallel to serve incompatible audiences without friction.

## Origin

**Archie (Anurag) Agarwal**, CEO and founder of **ThreatModeler Software, Inc.** VAST is the methodology embedded in the commercial ThreatModeler platform.

**⚠️ Grey literature caveat**: VAST has **no peer-reviewed academic publication**. Primary documentation is vendor-controlled at https://threatmodeler.com/innovation-lab/vast/. Researchers should treat it as practitioner framework, not academic method.

## The Dual-Track Model

### Application Threat Model
- Uses **process flow diagrams** (not standard DFDs)
- Oriented toward **developers**
- Focus: code-level threats, data flows, component interactions
- Output: actionable remediation for dev teams (shift-left)

### Operational Threat Model
- Uses **DFDs**
- Oriented toward **security operations** and infrastructure teams
- Focus: attacker perspective on deployed infrastructure
- Output: SOC runbooks, infrastructure hardening guidance

**Why dual-track**: A single DFD trying to serve both developers and SOC analysts is a common STRIDE failure mode. VAST separates concerns at the artifact level.

## Three Design Pillars

1. **Automation** — rules-based threat generation; templates across thousands of components
2. **Integration** — native plugins for Jira, Jenkins, AWS, GitHub, Azure DevOps
3. **Collaboration** — dev, security, ops, compliance all consume appropriate views

## When to Use

- **Large enterprises** with hundreds of applications and DevOps pipelines
- **Regulated industries** needing continuous compliance documentation
- Organizations where **manual STRIDE sessions are not viable at scale**
- Teams needing **Jira/CI integration** as a first-class requirement
- When budget allows commercial tooling (ThreatModeler is not free)

## Strengths

- **Enterprise scale** — designed for hundreds/thousands of concurrent threat models
- **Dual-track separation** — avoids single-diagram friction
- **Agile/sprint-compatible** via automation
- **Workflow approval** for governance-heavy orgs
- **Rich integrations** with existing DevOps toolchains

## Limitations

- **Vendor lock-in** — full realization requires ThreatModeler platform
- **No independent validation** — methodology details evolve commercially
- **Grey literature** — no peer-reviewed paper
- **Cost** — commercial licensing
- **Limited open ecosystem** — cannot easily migrate models to pytm, Threat Dragon, Threagile
- Attribution variance: secondary sources cite "Anurag Agarwal"; company materials use "Archie Agarwal" — confirmation: same person

## Relation to Other Frameworks

- **STRIDE** — VAST uses STRIDE-like threat categorization under the hood
- **Continuous Threat Modeling** — VAST is a commercial implementation of CTM principles
- **Threat-model-as-code** (pytm, Threagile) — VAST is the UI-driven commercial counterpart
- **IriusRisk** — commercial competitor with similar enterprise positioning
- **Shostack 4Q** — VAST automates Q1 (diagrams) and Q2 (threat enumeration) at scale

## References

- ThreatModeler: https://threatmodeler.com/
- VAST methodology: https://threatmodeler.com/innovation-lab/vast/
- Shevchenko, N. (2018). *Threat Modeling: 12 Available Methods*. CMU/SEI blog. (Classifies VAST alongside STRIDE, PASTA, LINDDUN, etc.)
