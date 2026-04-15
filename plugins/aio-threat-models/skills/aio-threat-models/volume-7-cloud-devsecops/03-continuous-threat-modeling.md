# Continuous Threat Modeling (CTM) & Threat Model as Code

> "A threat model that cannot be version-controlled and diffed is inadequate for modern engineering."
> — DevSecOps community consensus, post-2020

## Core Concept

**Continuous Threat Modeling (CTM)** integrates lightweight threat model reviews into sprint ceremonies — "threat modeling in the backlog" — rather than treating it as a one-time waterfall activity. **Threat Model as Code (TM-as-Code)** is the technical enabler: threat models expressed as source files (Python via pytm, YAML via Threagile) that live in version control alongside the code they describe, enabling automated re-analysis on architecture changes.

## Origin

**Continuous Threat Modeling** advocated by Autodesk's security team; Izar Tarandach (co-author of *Threat Modeling: A Practical Guide for Development Teams*, O'Reilly 2020) is a key promoter. Adam Shostack contributed conceptually. The Threat Modeling Manifesto (2020) values ("Continuous refinement over a single delivery") codified the philosophy.

**TM-as-Code** tools:
- **pytm** (OWASP) — Python-based, Matt Coles and Izar Tarandach. https://github.com/OWASP/pytm
- **Threagile** — YAML-based, Go implementation. https://threagile.io/

## Continuous Threat Modeling Principles

1. **Small, frequent** threat model reviews > periodic exhaustive sessions
2. **Triggered by architecture changes** — PRs touching DFD-relevant code trigger review
3. **Developer-owned** — shift-left; not gated by scarce security experts
4. **Lightweight artifacts** — diagrams as code, threat tables in markdown
5. **Backlogged threats** — unresolved threats become tickets, tracked like any other work
6. **Sprint retrospectives** — threat model Q4 ("did we do a good job") happens every sprint

## Threat Model as Code Approaches

### pytm (OWASP)

**Python DSL** — threat models are Python source files defining Actors, Servers, Datastores, Dataflows. pytm generates DFDs, sequence diagrams, and threat reports automatically.

```python
from pytm import TM, Server, Datastore, Dataflow, Boundary, Actor

tm = TM("My App Threat Model")
user = Actor("User")
web = Server("Web Server")
db = Datastore("Database")

flow_login = Dataflow(user, web, "Login credentials")
flow_query = Dataflow(web, db, "User data query")

tm.process()
```

Outputs: Graphviz DFDs, HTML threat reports, built-in STRIDE-based threat library (extensible).

### Threagile

**YAML DSL** — declarative architecture description. Runs as Docker CLI.

```yaml
technical_assets:
  web-server:
    type: process
    technologies: [web-server]
    trust_boundary: public-network
  database:
    type: datastore
    technologies: [database]
    trust_boundary: internal-network
```

Outputs: PDF/Excel reports, risk ratings, JSON for CI/CD integration. Custom rules written in Go plugins.

### Other Tools

- **Cairis** (research-grade, Shamal Faily) — unified requirements + security + usability
- **IriusRisk** (commercial) — questionnaire-driven, AI-augmented
- **OWASP Threat Dragon** (visual but file-backed with JSON)

## Key DevSecOps Integration Patterns

### CI/CD Integration

- **Pre-merge**: pytm/Threagile runs on PRs touching architecture files → threat diff in PR comment
- **Nightly**: full threat model regeneration; report to security team
- **Release gate**: unresolved critical threats block release

### GitOps for Threat Models

- Threat model files live alongside code
- Branch-per-environment threat models
- Diff-based threat reviews (e.g., "what threats did this PR introduce?")

### Backlog Integration

- Threat → Jira ticket via automation
- Mitigation tracked like any other story
- Sprint-level threat burndown chart

## When to Use

- **Modern agile / DevOps** engineering organizations
- **High velocity teams** — weekly releases, multiple changes per day
- **GitOps environments** — infrastructure + threat model both as code
- **Compliance programs** requiring evidence of continuous review
- **Microservices / cloud-native** — architecture changes constantly
- **Developer-led security** — shift-left culture

## Strengths

- **Scales** — pytm/Threagile handle thousands of components
- **Version-controlled** — diff-able, auditable
- **CI/CD friendly** — fits engineering workflows
- **Low per-review overhead** — once tooling established
- **Fights "stale DFD" problem** — model stays in sync with code

## Limitations

- **Tool maturity varies** — pytm/Threagile ecosystem smaller than Microsoft TMT
- **DSL learning curve** — devs must learn pytm Python or Threagile YAML
- **File format incompatibility** — cannot easily migrate between pytm, Threagile, Threat Dragon
- **Creative threats still require humans** — automation ≠ creativity
- **Cultural change required** — threat modeling as dev responsibility

## Anti-Patterns

- **Automation theater** — generating reports no one reads
- **Stale threat libraries** — built-in STRIDE rules not updated
- **Ignoring creative review** — automation replaces rather than augments human review
- **Too-granular DFDs** — every microservice modeled; 500-node diagrams

## Relation to Other Frameworks

- **Shostack 4Q** — CTM embeds 4Q in every sprint
- **Threat Modeling Manifesto** — "Continuous refinement" value is CTM's root
- **VAST** — commercial realization of CTM principles
- **DevSecOps practices** — SAST, DAST, SCA complement TM-as-code
- **SLSA supply chain** — TM + supply chain provenance for complete pipeline security

## References

- OWASP pytm: https://github.com/OWASP/pytm
- Threagile: https://threagile.io/
- Tarandach, I., Coles, M. (2020). *Threat Modeling: A Practical Guide for Development Teams*. O'Reilly.
- Threat Modeling Manifesto: https://www.threatmodelingmanifesto.org/
- Autodesk Continuous Threat Modeling handbook: https://github.com/Autodesk/continuous-threat-modeling
