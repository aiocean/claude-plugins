# Kubernetes Threat Matrix & Microservices Threat Modeling

> "Threat modeling Kubernetes means threat modeling four layers: Cloud, Cluster, Container, Code."
> — CNCF Cloud Native Security Whitepaper

## Core Concept

Kubernetes and microservices introduce attack surfaces absent from monolithic deployments: API server exposure, service mesh compromise, sidecar proxy attacks, RBAC misconfigurations, container supply chain, and secrets management. **Microsoft's Kubernetes Threat Matrix** maps MITRE ATT&CK tactics to Kubernetes-specific techniques, while the **CNCF Cloud Native Security Whitepaper** provides a four-layer reference model.

## CNCF 4-Layer Security Model

| Layer | Scope | Example Controls |
|---|---|---|
| **Cloud / Colocation** | Physical + provider infrastructure | Provider compliance; physical access |
| **Cluster** | Kubernetes control plane + workers | API server auth, etcd encryption, network policy |
| **Container** | Container image + runtime | Image signing, rootless runtime, seccomp |
| **Code** | Application code inside containers | SAST/DAST, dependency scanning, secrets management |

Each layer requires distinct threat modeling. Threat models spanning layers are common (e.g., container compromise → cluster escape).

Source: https://github.com/cncf/tag-security/tree/main/security-whitepaper

## Microsoft Kubernetes Threat Matrix

Maps MITRE ATT&CK tactics to Kubernetes-specific techniques. Originally published 2020, updated periodically. Structure parallels ATT&CK:

- **Initial Access**: Compromised images, malicious admission controllers, exposed kubelet
- **Execution**: Exec into container, sidecar injection, malicious CronJobs
- **Persistence**: Backdoor container, writable hostPath mounts, Kubernetes CronJob
- **Privilege Escalation**: Privileged container, hostPath volumes, Kubernetes role binding abuse
- **Defense Evasion**: Clear container logs, disable Kubernetes audit
- **Credential Access**: List K8s secrets, access container service account, access tiller endpoint
- **Discovery**: Access K8s API server, cluster enumeration
- **Lateral Movement**: Access cloud resources via pod identity, CoreDNS poisoning
- **Impact**: Data destruction, resource hijacking (cryptomining), DoS

## Key Threat Surfaces

### API Server
- **Unauthenticated API server exposure** → cluster takeover
- **Over-permissive RBAC** → excess privilege
- **Etcd access without encryption at rest** → credential theft

### Service Mesh (Istio, Linkerd)
- **mTLS misconfiguration** → lateral movement
- **Sidecar proxy compromise** → affects all services in pod
- **Certificate authority compromise** → catastrophic (trust root)

### Container Supply Chain
- **Compromised base images** (typosquatting, malicious maintainers)
- **Unsigned images** in registries
- **Insecure image pull policies**
- **Vulnerable dependencies** in image layers

### Secrets Management
- **Secrets in environment variables** (visible in process listings, logs)
- **vs CSI Secrets Store** (external secret managers: Vault, AWS Secrets Manager)
- **Etcd encryption at rest** (Kubernetes secrets are base64-encoded, not encrypted by default)

### Network Policies
- **Default-allow** cluster networking → unrestricted lateral movement
- **Missing egress controls** → data exfiltration
- **NodePort / LoadBalancer** misconfigurations

## When to Use

- **Every Kubernetes deployment** — K8s attack surface is non-trivial
- **Service mesh adoption** — Istio/Linkerd introduce own threats
- **Multi-tenant clusters** — namespace isolation is not security isolation
- **Regulated workloads on K8s** — HIPAA, PCI DSS require explicit K8s controls
- **GitOps / ArgoCD / Flux** — CD pipeline becomes part of threat model
- **Service mesh + zero-trust** — integrated threat modeling

## Strengths

- **Layered model** matches real attack paths
- **Microsoft Threat Matrix** provides concrete techniques
- **CNCF backing** — vendor-neutral reference
- **Rich tooling ecosystem** — Falco, kube-bench, Trivy, Polaris, Checkov
- **MITRE ATT&CK alignment** — familiar to security teams

## Limitations

- **Rapid K8s evolution** — threat matrices lag version releases
- **Provider variability** — GKE, EKS, AKS, OpenShift have different defaults
- **Multi-tenancy complexity** — cross-namespace and cross-cluster threats hard to model
- **Service mesh threats less documented** than K8s core
- **Eval'd attack scenarios scarce** — mostly hypothetical

## Relation to Other Frameworks

- **MITRE ATT&CK Containers Matrix** — technique-level detail
- **STRIDE** — still applies to service-level threats
- **Zero Trust (NIST SP 800-207)** — design pattern for K8s networking
- **SLSA (Supply-chain Levels for Software Artifacts)** — container supply chain framework
- **OPA (Open Policy Agent) / Kyverno** — policy enforcement for cluster threats

## References

- CNCF Cloud Native Security Whitepaper v2: https://github.com/cncf/tag-security/tree/main/security-whitepaper
- Microsoft Kubernetes Threat Matrix: https://www.microsoft.com/en-us/security/blog/2020/04/02/attack-matrix-kubernetes/ (original; see updated versions)
- NIST SP 800-204 series — Microservices security
- CIS Kubernetes Benchmark: https://www.cisecurity.org/benchmark/kubernetes
- SLSA framework: https://slsa.dev/
