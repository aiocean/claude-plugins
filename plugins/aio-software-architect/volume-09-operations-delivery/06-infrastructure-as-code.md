# Infrastructure as Code

> "If you can't rebuild your entire infrastructure from source control in an hour, you don't have infrastructure as code — you have infrastructure with documentation." — Kief Morris, Infrastructure as Code

## The Problem

Before Infrastructure as Code, production environments were maintained by a combination of runbooks, institutional memory, and heroism. A senior engineer knew that the production database cluster required a specific kernel parameter tuned to a non-default value, because they had set it eighteen months ago after an incident that revealed a connection limit bug. That knowledge lived in their head, occasionally in a wiki page that might be out of date, and in the current state of the server — but not in any form that could be used to reproduce the environment reliably.

This created what the industry calls "snowflake servers" — production environments that are unique, irreproducible, and brittle. Every snowflake server has accumulated configuration changes that no one fully understands and no one can fully reproduce. When a snowflake server fails, the recovery path is unclear. When you need to scale horizontally, you cannot confidently create a copy because you do not know the exact configuration of the original. When a security patch requires OS upgrade and the server cannot be patched in place, you discover that no one knows how to rebuild it.

The second problem is coordination. In organizations without IaC, infrastructure changes require tickets to a central operations team, wait times measured in days or weeks, manual execution of commands by an operator, and no audit trail beyond what the operator chose to write down. Development teams treat infrastructure as a scarce, slow, opaque resource that they must work around rather than with. This creates incentives for developers to minimize infrastructure changes, which means running their applications on outdated, oversized, or poorly configured resources rather than incurring the cost of requesting changes.

The third problem is repeatability across environments. "Works in staging, broken in production" is often an environment configuration problem. The staging database has a different timezone setting. The production load balancer has a different timeout. The staging deployment has a different number of replicas, so race conditions only appear in production. Without IaC, ensuring that environments are genuinely equivalent is a constant manual effort that teams consistently underinvest in.

## Core Concept

Infrastructure as Code (IaC) is the practice of managing and provisioning infrastructure through machine-readable configuration files rather than through manual processes or interactive tools. When your infrastructure is defined in code, it has all the properties of code: it can be version-controlled, reviewed, tested, diffed, rolled back, and shared.

The fundamental shift is treating infrastructure as a software engineering problem. The same practices that make application code reliable — version control, peer review, automated testing, continuous integration — apply to infrastructure configuration. A change to a production server is a pull request, not a ticket.

### Declarative vs. Imperative

The most important design choice in any IaC tool is whether it is declarative or imperative.

**Declarative IaC** describes the desired end state. You write "I want a VPC with these properties, a subnet with these properties, and an EC2 instance with these properties." The tool figures out what actions are needed to reach that state from the current state. Examples: Terraform, Pulumi (in declarative mode), CloudFormation, AWS CDK, Kubernetes manifests.

```hcl
# Terraform: declarative
resource "aws_instance" "api_server" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
  
  tags = {
    Name        = "api-server"
    Environment = "production"
  }
}
```

**Imperative IaC** describes the sequence of actions to take. You write "run this command, then run that command, then restart this service." The tool executes the commands in order. Examples: Ansible playbooks, Chef cookbooks, shell scripts.

```yaml
# Ansible: imperative
- name: Launch API server
  ec2_instance:
    name: api-server
    instance_type: t3.medium
    image_id: ami-0c55b159cbfafe1f0
    tags:
      Environment: production
```

Declarative is generally preferred for infrastructure provisioning because the tool handles idempotency — running the same configuration twice reaches the same state without duplicating resources. Imperative tools require the author to handle idempotency manually, which is error-prone.

Imperative tools are better for configuration management within a running system — installing software, configuring services, managing files — because the sequence of steps often matters and side effects are expected.

### State Management: The Core Challenge

Declarative IaC tools maintain a state file that records the current known state of all managed resources. The state file is how the tool knows what exists in your infrastructure without querying every cloud API on every run.

Terraform's state file is the most common example. It maps every resource in your configuration to a real cloud resource:

```json
{
  "resources": [{
    "type": "aws_instance",
    "name": "api_server",
    "instances": [{
      "attributes": {
        "id": "i-0a1b2c3d4e5f67890",
        "ami": "ami-0c55b159cbfafe1f0",
        "instance_type": "t3.medium",
        "private_ip": "10.0.1.50"
      }
    }]
  }]
}
```

State management is the source of most IaC operational complexity:

**State file storage**: The state file must be stored where all authorized operators can access it. Storing it locally works for a single developer; it breaks immediately in a team. Remote state backends (S3 + DynamoDB for Terraform, Terraform Cloud, Pulumi Cloud) are required for team use.

**State locking**: Two operators running `terraform apply` simultaneously can corrupt the state file. State backends must implement locking — only one operation can hold the lock at a time.

**State drift**: The state file may diverge from actual infrastructure if someone makes manual changes to resources outside of IaC. Drift detection — comparing the state file to the actual cloud state — is an ongoing operational concern.

**State file security**: The state file often contains sensitive data (database passwords, private keys, connection strings). It must be encrypted at rest and access-controlled as carefully as the infrastructure itself.

### Drift Detection

Drift is the condition where the actual state of your infrastructure diverges from what your IaC configuration declares. Drift happens when:
- Someone makes a manual change through the cloud console or CLI ("just this once")
- A cloud provider's auto-repair mechanism modifies a resource
- An external process modifies a configuration file on a managed server
- The state file is lost or corrupted and recreated from scratch

Drift is insidious because it is invisible. Your IaC configuration says the server has 8GB of RAM. Someone upgraded it to 16GB for a performance test and forgot to revert. The IaC configuration is wrong, but no one knows until the next `terraform plan` reveals a proposed change to downsize the server — typically at the worst possible moment.

Drift detection should be run on a schedule, independently of planned applies:

```bash
# Run in CI on a schedule (e.g., every 6 hours)
terraform plan -detailed-exitcode
# Exit code 0: no changes (no drift)
# Exit code 1: error
# Exit code 2: changes detected (drift!)
```

Automated drift detection with alerting is a standard practice in mature IaC environments. The alert says "someone modified the production database instance outside of IaC" — which is a security and compliance signal as much as an operational one.

### GitOps Workflow

The GitOps workflow treats Git as the single source of truth for infrastructure state. Infrastructure changes follow a pull request workflow identical to application code changes:

1. Engineer creates a branch, modifies IaC configuration
2. CI runs `terraform plan`, posts the diff as a PR comment
3. Peers review the diff — specifically, the planned infrastructure changes, not just the code
4. PR is merged to main
5. CD pipeline runs `terraform apply` automatically
6. Changes are live; the git commit is the audit trail

```yaml
# GitHub Actions: Terraform plan on PR
name: Terraform Plan
on:
  pull_request:
    paths:
      - 'infrastructure/**'

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: hashicorp/setup-terraform@v2
      
      - name: Terraform Init
        run: terraform init
        working-directory: infrastructure/
        
      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=tfplan
        working-directory: infrastructure/
        
      - name: Post Plan to PR
        uses: actions/github-script@v6
        with:
          script: |
            const plan = '${{ steps.plan.outputs.stdout }}'
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              body: `## Terraform Plan\n\`\`\`\n${plan}\n\`\`\``
            })
```

### Modules and Reusability

IaC code without modules is copy-paste infrastructure. Every environment (dev, staging, production) duplicates the same resource configurations with minor variations. When you need to update a configuration (change the instance type, update a security group rule), you update it in three places and inevitably miss one.

Terraform modules are reusable infrastructure components:

```hcl
# modules/rds-postgres/main.tf
variable "instance_class" { type = string }
variable "allocated_storage" { type = number }
variable "database_name" { type = string }
variable "environment" { type = string }

resource "aws_db_instance" "this" {
  engine               = "postgres"
  engine_version       = "15.4"
  instance_class       = var.instance_class
  allocated_storage    = var.allocated_storage
  db_name              = var.database_name
  
  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

output "endpoint" { value = aws_db_instance.this.endpoint }
output "port"     { value = aws_db_instance.this.port }
```

```hcl
# environments/production/main.tf
module "primary_database" {
  source = "../../modules/rds-postgres"
  
  instance_class    = "db.r6g.xlarge"
  allocated_storage = 500
  database_name     = "app_production"
  environment       = "production"
}

# environments/staging/main.tf
module "staging_database" {
  source = "../../modules/rds-postgres"
  
  instance_class    = "db.t3.medium"
  allocated_storage = 50
  database_name     = "app_staging"
  environment       = "staging"
}
```

The module defines the pattern once. Each environment instantiates it with environment-appropriate values. A change to the module propagates to all environments that use it.

### Testing Infrastructure Code

Infrastructure code has the same quality requirements as application code. It can have bugs, regressions, and security vulnerabilities. Testing is not optional.

**Static analysis**: Lint tools catch syntax errors and style violations.
- `terraform validate`: Validates configuration syntax
- `tflint`: Catches deprecated usage and best practice violations
- `tfsec` / `checkov`: Security scanning — finds common misconfigurations (S3 buckets with public access, security groups with 0.0.0.0/0, unencrypted storage)

**Unit tests**: Test module logic without provisioning real infrastructure.
- Terratest (Go): Write unit tests that call `terraform plan`, assert on the planned changes
- terraform-compliance: Policy-as-code for testing plan output

**Integration tests**: Provision real infrastructure in an isolated environment, run tests against it, destroy it.
```go
// Terratest integration test
func TestRDSModule(t *testing.T) {
    opts := &terraform.Options{
        TerraformDir: "../modules/rds-postgres",
        Vars: map[string]interface{}{
            "instance_class":    "db.t3.micro",
            "allocated_storage": 20,
            "database_name":     "test",
            "environment":       "test",
        },
    }
    
    defer terraform.Destroy(t, opts)
    terraform.InitAndApply(t, opts)
    
    endpoint := terraform.Output(t, opts, "endpoint")
    assert.NotEmpty(t, endpoint)
}
```

Integration tests cost real money (they provision real resources) and take real time (provisioning takes minutes). Run them in CI on merge to main, not on every PR.

### Blast Radius Management

IaC changes can have large blast radius. A misconfigured `terraform destroy` can delete an entire production environment. A wrong variable value can replace 50 instances simultaneously.

Strategies to reduce blast radius:

**Workspace isolation**: Separate Terraform workspaces or state files for each environment. An `apply` in the production workspace cannot affect the staging state.

**Targeted applies**: `terraform apply -target=module.api_servers` applies changes to only one module, not the entire configuration.

**Review gates**: Require manual approval for applies that affect production. Many CI/CD systems support "hold for approval" steps.

**Lifecycle rules**: Mark specific resources as protected from accidental deletion:

```hcl
resource "aws_db_instance" "primary" {
  # ... database config ...
  
  lifecycle {
    prevent_destroy = true  # terraform will error if this resource would be destroyed
  }
}
```

**Change limits**: Configure maximum change percentages — rolling updates that would replace more than 30% of instances simultaneously require explicit override.

## Deep Dive

### "Infrastructure as Code" (Kief Morris, 2016/2021): The Foundational Text

Kief Morris's "Infrastructure as Code" (O'Reilly, first edition 2016, second edition 2021) is the book that codified IaC as a discipline rather than a tool feature. The book's central argument: the problems that plague infrastructure management — inconsistency between environments, undocumented manual changes, inability to reproduce environments, fear of changes — are the same problems that plague software before version control and automated testing. The solution is the same: treat infrastructure definition as software.

The book introduces the concept of "configuration drift" as the fundamental enemy of reliable infrastructure: when infrastructure is modified outside of the IaC tooling (through manual console changes, direct SSH modifications, undocumented scripts), the actual state diverges from the declared state. Over time, drift accumulates. Environments that were originally identical become subtly different. Bugs appear in some environments but not others. The IaC definition stops being a reliable representation of reality.

Morris's prescription is the "immutable infrastructure" principle: rather than modifying running infrastructure, replace it. When an application server needs a configuration change, build a new server image with the change, provision new instances from the image, and terminate the old ones. This eliminates drift by making the IaC definition the only path to production — there is no running instance to drift from because the running instance is replaced on every change. The pattern is impractical for stateful resources (databases), but for stateless compute it is now the standard approach in containerized environments.

### Terraform's State Model and Its Implications

Terraform's design choice to maintain state externally (in a `.tfstate` file rather than querying live infrastructure on each run) is both its key performance optimization and its primary operational challenge. The state file is Terraform's model of what infrastructure exists and what it manages. Without it, Terraform cannot determine what to create, modify, or destroy — every operation would require querying the cloud provider API for every possible resource, which is prohibitively slow for large environments.

The state file creates two operational requirements that teams frequently underestimate. First, the state must be stored remotely and locked during operations: if two engineers run `terraform apply` simultaneously against a local state file, they will corrupt it. Remote backends (S3 with DynamoDB locking, Terraform Cloud, GitLab-managed state) solve this. Second, the state file must stay synchronized with actual infrastructure: if resources are modified outside Terraform, the state becomes stale. `terraform refresh` updates the state from actual infrastructure; `terraform import` adds existing resources to the state. Teams that mix Terraform with manual changes accumulate state debt that eventually requires painful manual reconciliation.

The practical implication documented extensively in the community: large Terraform workspaces (single state files managing hundreds of resources) become slow and risky. A `terraform plan` that must query 500 resources takes minutes. An apply that touches one resource holds the state lock for the duration. The recommended practice — splitting infrastructure into small, independently-managed workspaces organized by lifecycle (networking changes rarely; application compute changes frequently) — is an operational response to the state model's constraints, not a design best practice in the abstract.

## Implementation Guide

### Step 1: Start with One Module

Do not try to IaC your entire infrastructure at once. Pick one new resource or environment (ideally not production) and write the IaC for it. Learn the state management workflow, the review process, and the apply workflow before scaling.

### Step 2: Set Up Remote State

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-company-terraform-state"
    key            = "production/api/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

The DynamoDB table provides state locking. The S3 bucket must have versioning enabled (for state file recovery) and access logging (for audit trail).

### Step 3: Implement the PR Workflow

Every infrastructure change goes through a pull request with:
- `terraform plan` output posted as a PR comment (so reviewers see the diff)
- Required review from at least one other engineer
- Automated security scanning (tfsec or checkov)
- Apply on merge (automated, not manual)

### Step 4: Add Drift Detection

```yaml
# GitHub Actions: scheduled drift detection
name: Drift Detection
on:
  schedule:
    - cron: '0 */6 * * *'  # every 6 hours

jobs:
  drift-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check for drift
        run: |
          terraform init
          terraform plan -detailed-exitcode
        continue-on-error: true
      - name: Alert on drift
        if: steps.*.outcome == 'failure'
        run: |
          # Send alert to Slack/PagerDuty
          curl -X POST $SLACK_WEBHOOK -d '{"text": "Infrastructure drift detected in production!"}'
```

### Step 5: Module Library

Build a module library for your organization's common patterns: VPC with standard CIDR blocks and subnet layout, RDS with standard backup configuration and encryption, EKS cluster with standard node groups and networking. Modules encode your organization's infrastructure standards and make compliance automatic rather than aspirational.

## When to Use / When NOT to Use

**IaC is essential when:**
- You manage more than one environment (dev/staging/production)
- Your team has more than one person making infrastructure changes
- You need an audit trail for compliance (SOC 2, HIPAA, PCI DSS require evidence of change control)
- You need to recover from infrastructure failures

**IaC is overkill when:**
- You are prototyping and the infrastructure will be destroyed in days
- You have a single-person team with a single environment
- The infrastructure is entirely managed by a SaaS provider with no custom configuration

**Choose declarative over imperative for:**
- Cloud resource provisioning (VMs, databases, networks, storage)
- Kubernetes resources
- DNS records

**Choose imperative for:**
- OS-level configuration management within running servers
- Application deployment steps
- Complex conditional logic that declarative tools handle poorly

## Common Mistakes

**Storing secrets in IaC**: Never put passwords, API keys, or private keys in Terraform files. Use AWS Secrets Manager, HashiCorp Vault, or environment variables for secrets. Pass them to resources as references, not values.

**Monolithic state files**: A single state file for your entire infrastructure becomes a bottleneck and a blast radius problem. Split into logical units: networking, databases, applications. Each unit has its own state file.

**Manual changes in production**: The moment you make a change to production infrastructure outside of IaC, you have drift. "I'll just fix this in the console real quick" is how snowflake servers are born. All production changes go through IaC, always.

**Not versioning modules**: Modules referenced without a version pin (`source = "git::https://github.com/org/modules//rds"`) will silently pick up breaking changes. Always pin module versions: `source = "git::https://github.com/org/modules//rds?ref=v2.3.1"`.

**Ignoring the plan output**: `terraform plan` shows exactly what will change. Reviewing the plan is the most important safety check. Teams that apply without carefully reviewing the plan will eventually apply a destructive change they did not intend.

**Not testing before production**: IaC changes should be applied in dev or staging before production. A change that destroys and recreates a resource in staging is a learning opportunity. The same change in production is an incident.

## Connections

**GitOps (Article 08)**: GitOps is the operational model that makes IaC work at scale — Git as the single source of truth, automated reconciliation, pull-based deployment. IaC is the what; GitOps is the how.

**Platform Engineering (Article 07)**: Internal developer platforms are built on IaC. The platform team maintains the IaC modules and templates that application teams use to provision their infrastructure.

**Deployment Strategies (Article 04)**: Rolling updates, blue-green deployments, and canary rollouts are all implemented at the infrastructure level using IaC — Terraform resource configurations, Kubernetes rollout strategies, and load balancer rules are all infrastructure code.

**Incident Management (Article 09)**: IaC is a key recovery tool in incidents. When infrastructure needs to be rebuilt after a failure, having all configuration in code means recovery is `terraform apply`, not a multi-hour manual reconstruction from runbooks.

## Key Insights

The discipline of IaC is not primarily about tools — it is about the workflow that treats infrastructure changes with the same rigor as application code changes. Terraform without pull request review, automated planning, and drift detection is just a fancier way of making manual changes. The tool has no value without the process.

State management is the most underappreciated complexity in IaC adoption. Teams that start with local state discover the problem the first time two engineers run `apply` simultaneously. Plan for remote state, locking, and state organization before you have your first state corruption incident.

Drift is not just a technical problem — it is a trust problem. An IaC configuration that may or may not reflect reality provides false confidence. Drift detection, run on a schedule and generating alerts, is required to maintain the invariant that IaC is the source of truth. Without it, the invariant decays silently.

The long-term value of IaC is not faster provisioning — it is institutional knowledge externalized into code. The snowflake server that only one person knows how to maintain becomes a liability when that person leaves. The IaC configuration that describes every detail of production infrastructure is an organizational asset that outlasts any individual engineer.
