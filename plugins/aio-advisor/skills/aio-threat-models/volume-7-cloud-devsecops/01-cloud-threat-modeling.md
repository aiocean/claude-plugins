# Cloud Threat Modeling

> "The shared responsibility model is the foundational threat modeling artifact for cloud — everything else follows from where the line is drawn."

## Core Concept

**Cloud threat modeling** applies classic frameworks (STRIDE, LINDDUN, PASTA) adapted to cloud-native architectures, with the **shared responsibility model** as the root trust boundary. Unlike on-premise threat modeling where the organization controls the stack, cloud threat modeling must explicitly delineate responsibilities between cloud provider and customer — the boundary varies by service model (IaaS, PaaS, SaaS, FaaS).

## Shared Responsibility Model

The foundational cloud threat modeling artifact:

| Layer | IaaS | PaaS | SaaS |
|---|---|---|---|
| Physical security | Provider | Provider | Provider |
| Hypervisor / compute host | Provider | Provider | Provider |
| Network infrastructure | Provider | Provider | Provider |
| OS patching | Customer | Provider | Provider |
| Runtime / middleware | Customer | Provider | Provider |
| Application code | Customer | Customer | Provider |
| Customer data | Customer | Customer | Customer |
| IAM (identities, access) | Customer | Customer | Customer |

**Always-customer responsibilities**: identities, access, data classification, application logic, configuration.

## Provider Frameworks

### AWS Well-Architected — Security Pillar

Seven design principles:
1. Implement a strong identity foundation
2. Apply security at all layers
3. Automate security best practices
4. Protect data in transit and at rest
5. Keep people away from data
6. Prepare for security events
7. Reduce the attack surface

Documentation: https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/

### Azure / Microsoft Threat Modeling

Microsoft TMT provides **Azure-specific stencils** (Storage, Key Vault, Service Bus, App Service, Function App, etc.) with pre-built threat templates. Integrates with Azure Policy for compliance enforcement.

Tool: https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool

### Google Cloud Security

Google Cloud Architecture Framework Security Pillar; BeyondCorp zero-trust model foundations.

## Cloud Security Alliance (CSA) Top Threats — "Egregious 11"

Periodically updated catalog:

1. Data breaches
2. Misconfiguration and inadequate change control
3. Lack of cloud security architecture and strategy
4. Insufficient identity, credential, access, and key management
5. Account hijacking
6. Insider threat
7. Insecure interfaces and APIs
8. Weak control plane
9. Metastructure and applistructure failures
10. Limited cloud usage visibility
11. Abuse and nefarious use of cloud services

Source: https://cloudsecurityalliance.org/research/topics/top-threats

## Cloud-Specific Threat Categories

Beyond classic STRIDE, cloud introduces:

- **Metastructure threats** — attacks on cloud provider control plane (cross-tenant)
- **Applistructure threats** — attacks on cloud-managed application services (RDS, Lambda, S3)
- **Multi-tenancy risks** — noisy-neighbor, side-channel, cross-tenant isolation failures
- **API and IAM misconfigurations** — root cause of most cloud breaches
- **Supply chain / third-party dependencies** — Marketplace images, serverless layers
- **Cost-based DoS** — amplified resource consumption drives financial damage

## When to Use

- **Every cloud deployment** — the shared responsibility model is non-negotiable
- **Multi-cloud / hybrid** — threat models must span provider boundaries
- **Regulatory compliance** — PCI DSS, HIPAA, SOC 2 cloud-specific controls
- **Cloud migrations** — re-threat-model when moving from on-prem
- **New cloud service adoption** — novel services carry novel threats

## Strengths

- **Provider tooling maturity** — AWS/Azure/GCP all provide TM guidance and stencils
- **Well-documented attack patterns** — CSA, OWASP Cloud-Native Security catalogs
- **Compliance alignment** — cloud providers publish compliance-mapped threat models
- **Automation-friendly** — cloud infrastructure is code; threat models can be generated

## Limitations

- **Shared responsibility confusion** — customers consistently underestimate their responsibilities
- **Provider-specific knowledge required** — AWS IAM ≠ Azure RBAC ≠ GCP IAM
- **Rapid service evolution** — threat models outdated within months
- **Cross-tenant / supply chain** threats hard to model (depend on provider behavior)
- **Multi-cloud complexity** — threat surface multiplies with each provider

## Relation to Other Frameworks

- **STRIDE / LINDDUN** — still apply to application logic in cloud
- **MITRE ATT&CK Cloud Matrix** — cloud-specific TTPs (Azure AD, AWS, GCP)
- **CNCF Cloud Native Security Whitepaper** — for cloud-native (K8s) systems
- **Zero Trust Architecture (NIST SP 800-207)** — foundational design pattern
- **Cloud Controls Matrix (CCM)** — CSA compliance mapping

## References

- AWS Well-Architected Security Pillar: https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/
- Microsoft Threat Modeling Tool: https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool
- CSA Top Threats: https://cloudsecurityalliance.org/research/topics/top-threats
- NIST SP 800-207 Zero Trust Architecture: https://csrc.nist.gov/pubs/sp/800/207/final
- CSA Cloud Controls Matrix: https://cloudsecurityalliance.org/research/cloud-controls-matrix
