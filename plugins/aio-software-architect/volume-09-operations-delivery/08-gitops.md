# GitOps — Declarative Delivery

> "GitOps is what happens when you apply the DevOps practices of continuous delivery to infrastructure, using Git as the single source of truth for both declarative infrastructure and applications." — Alexis Richardson, Weaveworks CEO

## The Problem

Continuous delivery pipelines solved the deployment problem for application code: commit, build, test, deploy — automated end to end. But they solved it in a "push" model where the pipeline actively pushes changes into production. The production environment is a target that the pipeline writes to. This model works for application deployments, but it creates a systemic problem for infrastructure: what is the authoritative description of what should be running in production right now?

With push-based pipelines, the answer is: whatever the pipeline last pushed. But the pipeline is not the only thing that can change production. An engineer with kubectl access can apply a manifest manually. A runbook step says "edit the configmap to increase the replica count." An incident responder patches a deployment directly because there is no time to go through the pipeline. Each of these changes makes production drift from what the pipeline last deployed, and the pipeline has no mechanism to detect or correct that drift.

The second problem is access control and audit trail. In push-based deployments, the deployment pipeline (or the engineer running it) has write access to the production Kubernetes cluster. The credentials that allow the pipeline to deploy also allow it — or anyone who compromises it — to delete namespaces, modify secrets, or access any resource in the cluster. The blast radius of a compromised CI/CD pipeline in a push model is the entire cluster.

The third problem is operational consistency. Infrastructure state is not just what Kubernetes is running — it is the sum of all configuration decisions: which services are deployed, what versions, with what resource limits, with what environment variables, with what secrets references. Tracking all of this across multiple clusters, multiple environments, and multiple teams requires a coordination mechanism that ad-hoc pipeline executions do not provide. When you need to understand why production is behaving differently from staging, the answer should be a git diff, not an investigation of pipeline execution logs.

## Core Concept

GitOps is an operational framework for managing infrastructure and application deployments where Git is the single source of truth for the desired state of the system. Instead of pipelines that push changes to production, a GitOps operator running inside the cluster continuously reconciles the actual cluster state with the desired state declared in Git.

Alexis Richardson of Weaveworks, who coined the term in 2017, defined the four principles of GitOps:

1. **Declarative**: The desired state of the system must be expressed declaratively. Kubernetes manifests, Helm charts, Kustomize overlays — any format that fully describes what should be running.

2. **Versioned and immutable**: The desired state is stored in Git. Every change is a commit. Every commit is immutable. The complete history of every configuration change is preserved and auditable.

3. **Pulled automatically**: Approved changes to the desired state in Git are applied automatically by a software agent (the GitOps operator), not pushed by a pipeline. The agent continuously polls Git for changes.

4. **Continuously reconciled**: The software agent continuously compares the actual cluster state to the desired state in Git and corrects any divergence. If a resource is manually deleted or modified, the agent restores it to match Git.

### Pull-Based vs. Push-Based

The architectural difference between GitOps (pull-based) and traditional CD (push-based) has security and operational implications that go beyond workflow preference.

**Push-based (traditional CI/CD)**:
```
Developer → Git → CI Pipeline → kubectl apply → Kubernetes Cluster
```
The CI pipeline holds credentials to write to the Kubernetes cluster. The cluster is passive. Changes originate outside the cluster.

**Pull-based (GitOps)**:
```
Developer → Git ← GitOps Operator ← Kubernetes Cluster
                    (operator polls Git and applies changes)
```
The GitOps operator runs inside the cluster and pulls changes from Git. The cluster holds only read credentials for Git. No external system writes to the cluster. Changes originate inside the cluster, triggered by Git state changes.

The security implication is significant: in pull-based GitOps, compromising the CI/CD system does not give an attacker write access to the production cluster. The attacker can only push to Git — and that push is subject to branch protection rules, required reviewers, and the normal PR process. The GitOps operator will apply the change only after it has been merged to the protected main branch.

### The Reconciliation Loop

The heart of GitOps is the reconciliation loop: the continuous process of comparing desired state (Git) to actual state (cluster) and correcting divergence.

```
Every N seconds:
1. Read desired state from Git repository
2. Read actual state from Kubernetes cluster
3. Compute diff: desired - actual
4. Apply diff to cluster
5. Record sync status (in-sync, out-of-sync, error)
```

This loop runs continuously. Manual changes to the cluster are automatically reverted within the next reconciliation cycle (typically 30-180 seconds). This is not a bug — it is the GitOps contract: Git is authoritative, and divergence from Git is corrected automatically.

For emergency situations where a manual change must persist, GitOps operators provide a "suspend sync" feature that pauses reconciliation for a resource or namespace. This must be explicit and temporary — the emergency change should be reflected in Git as soon as the emergency is resolved.

### ArgoCD: The GitOps Reference Implementation

ArgoCD is the most widely used open-source GitOps operator. It runs inside the Kubernetes cluster, monitors one or more Git repositories, and reconciles cluster state to match.

An ArgoCD Application resource defines what to sync and where:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payment-service
  namespace: argocd
spec:
  project: production
  
  # Source: where is the desired state?
  source:
    repoURL: https://github.com/org/k8s-config
    targetRevision: main
    path: services/payment-service/production
  
  # Destination: where to apply it?
  destination:
    server: https://kubernetes.default.svc
    namespace: payment-service
  
  syncPolicy:
    automated:
      prune: true       # delete resources removed from Git
      selfHeal: true    # revert manual changes to cluster
    syncOptions:
      - CreateNamespace=true
```

With `automated.selfHeal: true`, ArgoCD continuously enforces the Git state. With `automated.prune: true`, resources deleted from Git are also deleted from the cluster. These two settings together implement the full GitOps contract.

### Flux: The Alternative

Flux (developed by Weaveworks, the company that coined GitOps) is the other major GitOps operator. Flux takes a more Kubernetes-native approach — everything is a Kubernetes custom resource — while ArgoCD provides a richer UI and more explicit application-centric model.

```yaml
# Flux GitRepository: watch this repo
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: k8s-config
spec:
  interval: 1m
  url: https://github.com/org/k8s-config
  ref:
    branch: main

# Flux Kustomization: apply this path from the repo
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: payment-service
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: k8s-config
  path: ./services/payment-service/production
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: payment-service
      namespace: payment-service
```

Flux is often preferred for organizations that want everything managed as Kubernetes resources (operators all the way down) and for GitOps-bootstrapped clusters where Flux itself is managed by GitOps.

### Multi-Environment Promotion

A critical GitOps workflow is promotion: deploying a new version from staging to production. In GitOps, promotion is a Git operation — a commit that changes the image tag or chart version in the production configuration.

Common patterns:

**Directory-based environments**:
```
k8s-config/
├── services/
│   └── payment-service/
│       ├── staging/
│       │   └── kustomization.yaml  # image: payment-service:v1.5.0
│       └── production/
│           └── kustomization.yaml  # image: payment-service:v1.4.8
```

To promote v1.5.0 to production, open a PR that changes `production/kustomization.yaml` to `image: payment-service:v1.5.0`. The PR is the review gate. Merge triggers ArgoCD to deploy.

**Branch-based environments**:
```
main branch → production
staging branch → staging
dev branch → development
```

Promotion is a git merge. The review process is a standard PR. Less flexible than directory-based (you cannot have multiple services at different versions) but simpler to reason about.

**Image update automation**: ArgoCD Image Updater and Flux Image Automation Controller can automatically update image tags in Git when new images are pushed to the container registry, automating the "update image tag in Git" step:

```yaml
# ArgoCD Image Updater annotation
annotations:
  argocd-image-updater.argoproj.io/image-list: payment-service=org/payment-service
  argocd-image-updater.argoproj.io/payment-service.update-strategy: semver
  argocd-image-updater.argoproj.io/payment-service.allow-tags: regexp:^v[0-9]+\.[0-9]+\.[0-9]+$
  argocd-image-updater.argoproj.io/write-back-method: git
```

With this configuration, pushing `payment-service:v1.5.1` to the registry automatically opens a PR updating the staging image tag. A human reviews and merges the PR. ArgoCD deploys. For staging, the PR merge can be automated (auto-merge on passing tests). For production, it requires explicit human approval.

### Secrets Management in GitOps

GitOps has an inherent tension with secrets: the Git repository is the source of truth, but secrets must not be stored in plaintext in Git. Several patterns address this:

**Sealed Secrets (Bitnami)**: Encrypt secrets using a public key, store the encrypted form in Git. The controller in the cluster decrypts using the private key. The plaintext never exists in Git.

```bash
# Seal a secret for storage in Git
kubectl create secret generic db-password \
  --from-literal=password=supersecret \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > sealed-db-password.yaml
# sealed-db-password.yaml is safe to commit to Git
```

**External Secrets Operator**: Kubernetes resources that reference secrets in external secret stores (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager). The actual secret value never exists in Git — only a reference to where it lives.

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
    - secretKey: password
      remoteRef:
        key: production/payment-service/db-credentials
        property: password
```

**SOPS**: Encrypt individual values within YAML/JSON files. The file structure is visible in Git; only the values are encrypted. Flux has native SOPS support.

## Deep Dive

### The GitOps Principles: What the CNCF Formalized

The CNCF GitOps Working Group (established 2021) published the OpenGitOps principles — a vendor-neutral specification of what GitOps actually requires. The four principles are: declarative (the desired system state is expressed as declarations, not procedures), versioned and immutable (the desired state is stored in a version control system that enforces immutability of previous versions), pulled automatically (software agents automatically apply the desired state from the repository), and continuously reconciled (software agents continuously compare actual state to desired state and correct deviations).

The reconciliation principle is the most consequential. It distinguishes GitOps from "deployment from Git" — using Git as the source of a push-based deployment script. In true GitOps, the cluster continuously polls Git and corrects any drift. A manual change applied directly to the cluster will be reversed within the reconciliation interval. This means Git is not just the record of what was deployed — it is the live enforcement mechanism for what is running. This property is what makes GitOps operationally different: it eliminates the category of "I changed the config but forgot to commit it" incidents, because uncommitted changes are automatically reverted.

The pull-based model also changes the security architecture of CD. In push-based deployment, the CI system holds credentials to the cluster and pushes changes — CI compromise means cluster compromise. In pull-based GitOps, the cluster holds read-only Git credentials and the CI system has no direct cluster access. The attack surface for cluster compromise through the CI pipeline is eliminated.

### The Raft of GitOps: Why Eventual Consistency Is Acceptable Here

GitOps accepts eventual consistency between the Git state and the cluster state — the reconciliation loop may take seconds to minutes to apply a change. This is a deliberate trade-off. The SRE Book's principle of "toil reduction through automation" supports this: the alternative to eventual consistency in GitOps is synchronous deployment coordination (someone must watch the deploy succeed before the deploy is considered done), which scales poorly and introduces operational complexity.

The key insight from Weaveworks' original GitOps design is that the reconciliation period is bounded and observable. The reconciliation controller (Flux, ArgoCD) emits events and exposes status on every application — you can query "what is the current sync status of my application?" and get a definitive answer. The eventual consistency window is not "some indeterminate future time" — it is "within the next reconciliation interval, typically 30-60 seconds." For most operations, this is indistinguishable from synchronous deployment from the user perspective, while providing dramatically simpler operational characteristics.

The DORA metrics for GitOps-adopting teams confirm the trade-off works: deployment frequency increases (removing human bottlenecks from the deployment path), change failure rate decreases (mandatory code review and automated validation before any production change), and MTTR decreases (rollback is a Git revert that triggers automatic reconciliation). These are exactly the outcomes the DORA research identifies as markers of high-performing engineering organizations.

## Implementation Guide

### Step 1: Separate the Config Repository

GitOps requires a dedicated repository for Kubernetes manifests, separate from application code:

```
Structure:
k8s-config/
├── infrastructure/
│   ├── namespaces/
│   ├── rbac/
│   └── monitoring/
├── services/
│   ├── payment-service/
│   │   ├── base/            # base manifests (deployment, service, hpa)
│   │   ├── staging/         # staging overlay (image tag, replicas)
│   │   └── production/      # production overlay
│   └── order-service/
│       ├── base/
│       ├── staging/
│       └── production/
└── argocd/
    └── applications/        # ArgoCD Application resources
```

Branch protection on main: no direct pushes, required PR reviews, status checks must pass before merge.

### Step 2: Install and Bootstrap ArgoCD

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Bootstrap: the ArgoCD installation itself is managed by ArgoCD (app-of-apps pattern)
kubectl apply -f - <<EOF
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argocd-apps
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/org/k8s-config
    path: argocd/applications
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
EOF
```

The "app-of-apps" pattern: a root ArgoCD Application manages the ArgoCD Application resources for all other services. The entire platform state — including the GitOps configuration itself — is managed by GitOps.

### Step 3: Build the Promotion Workflow

```yaml
# GitHub Actions: promote to staging on successful main build
name: Promote to Staging
on:
  push:
    branches: [main]
    
jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout k8s-config
        uses: actions/checkout@v3
        with:
          repository: org/k8s-config
          token: ${{ secrets.CONFIG_REPO_TOKEN }}
          
      - name: Update staging image tag
        run: |
          cd services/payment-service/staging
          kustomize edit set image payment-service=org/payment-service:${{ github.sha }}
          
      - name: Create PR for staging promotion
        uses: peter-evans/create-pull-request@v5
        with:
          title: "Deploy payment-service ${{ github.sha }} to staging"
          branch: "promote/payment-service-staging-${{ github.sha }}"
          auto-merge: true   # auto-merge for staging
```

Production promotion requires a human-reviewed PR without auto-merge.

### Step 4: Configure Drift Alerts

ArgoCD provides sync status that can be exported as Prometheus metrics:

```yaml
# Alert on out-of-sync applications
- alert: ArgoCDAppOutOfSync
  expr: argocd_app_info{sync_status="OutOfSync"} == 1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "ArgoCD application {{ $labels.name }} is out of sync"
    description: "App has been out of sync for 5+ minutes — manual changes detected or sync failing"
```

## When to Use / When NOT to Use

**GitOps is right for:**
- Kubernetes-based workloads where the desired state is expressible as manifests
- Multi-cluster environments where consistent state management is critical
- Organizations with compliance requirements for change audit trails
- Teams where production access should be minimal and audited

**GitOps is overkill for:**
- Simple single-instance deployments where a push-based pipeline is straightforward
- Non-Kubernetes workloads (GitOps operators are Kubernetes-native; adapting them to VMs or serverless is complex)
- Very small teams where the PR workflow for every configuration change adds friction without proportional benefit

**Avoid these GitOps anti-patterns:**
- Committing secrets to Git (use Sealed Secrets or External Secrets)
- Using GitOps for stateful data migrations (it manages desired state, not migration sequences)
- Over-splitting repositories (one repo per service creates coordination overhead)

## Common Mistakes

**Making every change require a PR**: Operations that need to happen immediately — increasing a replica count during an incident — should not require a PR review. GitOps does not mean every change is slow; it means every change is recorded. Emergency changes can be made directly and then reflected in Git afterward.

**Ignoring ArgoCD's own reliability**: ArgoCD is critical infrastructure. If it is down, no deployments happen. It needs the same SLO treatment as any production service: monitoring, alerting, backup configuration.

**One giant config repository**: A single config repo for 100 services becomes a merge conflict nightmare and makes access control coarse-grained. Partition the config repo by team, by environment, or by criticality, with appropriate permissions on each partition.

**Not testing Kubernetes manifests**: Manifests that fail to apply stop the entire GitOps sync. Add manifest validation (`kubectl apply --dry-run=server`) to the PR checks for the config repo.

**Manually modifying cluster state for too long**: The GitOps contract — manual changes are reverted by the reconciler — is broken by "suspend sync" that is never resumed. Suspensions must have an expiry and an owner.

## Connections

**Infrastructure as Code (Article 06)**: IaC (Terraform) manages cloud infrastructure. GitOps manages Kubernetes workloads. They are complementary: IaC provisions the clusters and underlying infrastructure; GitOps manages what runs on the clusters. Both use Git as source of truth.

**Deployment Strategies (Article 04)**: Argo Rollouts extends ArgoCD to support canary and blue-green deployments as GitOps-managed resources. Progressive delivery is implemented within the GitOps framework.

**Platform Engineering (Article 07)**: GitOps is a core component of the golden path in most platform engineering implementations. The platform team manages the ArgoCD/Flux installation; application teams use GitOps for their deployments.

**Incident Management (Article 09)**: Rollback in a GitOps system is `git revert` — a single command that reverts the desired state to the previous commit, which the reconciler then applies. GitOps makes rollback mechanical and auditable.

## Key Insights

The insight that makes GitOps powerful is not the use of Git — it is the reconciliation loop. Storing configuration in Git without continuous reconciliation is just documentation. With continuous reconciliation, Git becomes genuinely authoritative: the system continuously enforces that reality matches the description in Git. This is a fundamentally different reliability guarantee than "we deploy from Git."

The pull model's security advantage is underappreciated. Push-based deployments require giving external systems (CI/CD pipelines, human operators) write access to production clusters. Pull-based GitOps requires only read access to Git repositories. The attack surface reduction — an entire class of credential-compromise attacks is eliminated — is a concrete security improvement, not just a theoretical one.

Multi-environment promotion via Pull Requests is the GitOps pattern that most directly improves developer experience. The PR-based promotion workflow creates a natural review gate, a clear audit trail, and a simple rollback story — all with tooling developers already know. Compared to "run this Jenkins job with these parameters," the GitOps promotion workflow is more transparent, more reviewable, and less error-prone.

GitOps is not a replacement for application testing or infrastructure testing. It ensures that the desired state declared in Git is what runs in production. If the desired state is wrong — incorrect configuration, insufficient resources, security vulnerabilities in the manifest — GitOps will faithfully apply it. The quality of what runs in production is determined by the quality of what is committed to Git. GitOps shifts the quality enforcement burden to the PR review process.
