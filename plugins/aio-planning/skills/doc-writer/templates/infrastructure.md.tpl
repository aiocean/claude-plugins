# Infrastructure

<!-- ORACLE:INSTRUCTIONS
This doc is filled by the infra-analyst.
Only generated when Dockerfile, docker-compose, CI config, k8s manifests, or cloud config found.

Tools to use:
- Glob: find infra files — "Dockerfile*", "docker-compose*", ".github/workflows/**", ".gitlab-ci.yml", "Jenkinsfile", "k8s/**", "terraform/**", "fly.toml", "vercel.json", "netlify.toml", "render.yaml"
- Read: each infra config file
- Grep: find env var references — "process.env", "os.Getenv", "env::", "ENV"
- Grep: find port bindings — "PORT", "listen(", "EXPOSE"
- Read: .env.example or .env.template for required variables
-->

## Deployment Diagram

<!-- ORACLE:DEPLOYMENT
Generate a Mermaid C4Deployment diagram showing where things run.

If C4Deployment not supported, fall back to a flowchart:
```
flowchart TD
    subgraph Cloud["Cloud Provider"]
        API[API Server]
        DB[(Database)]
    end
    User --> API
    API --> DB
```

Steps:
1. Read Dockerfile(s) to identify containerized services
2. Read docker-compose for service topology and networking
3. Check CI config for deployment targets
4. Check cloud config files (fly.toml, vercel.json, etc.)
-->

```mermaid
C4Deployment
    title Deployment — REPLACE_SYSTEM_NAME
    REPLACE_NODES_AND_CONTAINERS
```

## Services

<!-- ORACLE:SERVICES
List each deployable service:
- Name and what it does
- Technology / runtime
- Port it listens on
- What it depends on (other services, databases, queues)

Sources: docker-compose.yml, Dockerfile(s), k8s manifests, process managers (PM2, Procfile)
-->

| Service | Technology | Port | Dependencies |
|---------|-----------|------|-------------|
| REPLACE | REPLACE | REPLACE | REPLACE |

## CI/CD Pipeline

<!-- ORACLE:CICD
Document the CI/CD pipeline:
- What triggers it (push, PR, tag, schedule)
- Stages/jobs and what each does
- Test commands run
- Build/deploy commands
- Environment targets (staging, production)

Tool: Read the CI config files (.github/workflows/*.yml, .gitlab-ci.yml, etc.)
-->

### Pipeline: REPLACE: pipeline name

**Trigger**: REPLACE: what triggers it
**Stages**:
1. REPLACE: stage name — REPLACE: what it does
2. REPLACE: stage name — REPLACE: what it does

<!-- ORACLE:MORE_PIPELINES
Add sections for additional pipelines if multiple exist.
Delete this comment when done.
-->

## Environment Configuration

<!-- ORACLE:ENV_CONFIG
List all environment variables the system needs.
Sources:
- .env.example / .env.template (Read these first)
- Grep for process.env / os.Getenv across codebase
- docker-compose.yml environment sections
- CI config variable references

For each variable:
- Required or optional
- What it configures
- Example value format (without real secrets)
-->

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| REPLACE | REPLACE | REPLACE | REPLACE |

## Cloud Services

<!-- ORACLE:CLOUD
List external cloud services used:
- What provider (AWS, GCP, Azure, Cloudflare, etc.)
- What service (S3, RDS, Cloud Run, etc.)
- What it's used for
- How it's configured (SDK, API, terraform, etc.)

Sources:
- Grep for SDK imports (aws-sdk, @google-cloud, @azure)
- Terraform/Pulumi files
- Cloud-specific config files
- README deployment instructions
-->

| Provider | Service | Used For | Configuration |
|----------|---------|----------|--------------|
| REPLACE | REPLACE | REPLACE | REPLACE |

<!-- ORACLE:NO_CLOUD
If no cloud services detected, replace the table with:
"No cloud services detected. System appears to be self-hosted or uses local infrastructure."
Delete this comment when done.
-->
