# Getting Started

<!-- ORACLE:INSTRUCTIONS
This doc is filled by the onboarding-analyst.
Generated for every project to help new contributors get productive quickly.

Tools to use:
- Read: README.md for existing setup instructions
- Glob: find setup files — "Makefile", "Dockerfile", "docker-compose*", "package.json", "go.mod", "requirements.txt", "Pipfile", "Cargo.toml", "pyproject.toml"
- Read: setup/install scripts and config files
- Glob: find env templates — ".env.example", ".env.template", ".env.sample", "env.example"
- Read: CONTRIBUTING.md, DEVELOPMENT.md if they exist
- Grep: find dev scripts — "dev", "start", "serve", "watch" in package.json / Makefile

Discovery commands:
```bash
# Find setup/install scripts
ls Makefile Dockerfile docker-compose* package.json go.mod requirements.txt Pipfile Cargo.toml pyproject.toml 2>/dev/null
# Find README with setup instructions
head -100 README.md 2>/dev/null
# Find env templates
ls .env.example .env.template .env.sample env.example 2>/dev/null
```
-->

## Prerequisites

<!-- ORACLE:PREREQUISITES
List runtime versions and tools needed to work on this project.

Tools:
- Read package.json for node engine requirements
- Read go.mod for Go version
- Read pyproject.toml / Pipfile for Python version
- Read .tool-versions / .node-version / .nvmrc / .python-version for version pinning
- Read Dockerfile for base image (implies runtime version)
- Read README for prerequisite instructions

```bash
# Find version specifications
cat .node-version .nvmrc .python-version .tool-versions .go-version .ruby-version 2>/dev/null
# Find engine requirements in package.json
cat package.json 2>/dev/null | python3 -c "
import json, sys
pkg = json.load(sys.stdin)
engines = pkg.get('engines', {})
for k, v in engines.items(): print(f'{k}: {v}')
"
# Find Go version
head -3 go.mod 2>/dev/null
```
-->

| Tool | Version | Notes |
|------|---------|-------|
| REPLACE | REPLACE | REPLACE |

## Quick Start

<!-- ORACLE:QUICKSTART
Provide a clone-to-running sequence that works in under 5 minutes.
Steps should be copy-pasteable commands.

Tools:
- Read README.md for existing quick start
- Read Makefile for setup targets
- Read package.json for install/dev scripts
- Read docker-compose.yml for one-command startup

```bash
# Find install and start commands
cat package.json 2>/dev/null | python3 -c "
import json, sys
pkg = json.load(sys.stdin)
scripts = pkg.get('scripts', {})
for key in ['install', 'setup', 'dev', 'start', 'serve', 'build']:
    if key in scripts: print(f'{key}: {scripts[key]}')
"
# Find Makefile targets
grep "^[a-zA-Z_-]*:" Makefile 2>/dev/null | head -10
```
-->

```bash
# 1. Clone the repository
git clone REPLACE_REPO_URL
cd REPLACE_PROJECT_NAME

# 2. Install dependencies
REPLACE_INSTALL_COMMAND

# 3. Configure environment
REPLACE_ENV_SETUP

# 4. Start the development server
REPLACE_DEV_COMMAND
```

## Development Workflow

<!-- ORACLE:WORKFLOW
Document the typical development loop:
- How to create a feature branch
- How to run the project locally
- How to run tests before submitting
- How to submit changes (PR process, required checks)
- Code style enforcement (linters, formatters, pre-commit hooks)

Tools:
- Read CONTRIBUTING.md for workflow documentation
- Read .github/pull_request_template.md for PR expectations
- Grep for pre-commit hooks — ".husky", "pre-commit", "lint-staged"
- Read linter/formatter config — ".eslintrc*", ".prettierrc*", ".golangci*", "ruff.toml"

```bash
# Find code quality tooling
ls .eslintrc* .prettierrc* .golangci* .editorconfig .pre-commit-config.yaml ruff.toml 2>/dev/null
# Find pre-commit hooks
ls .husky/* 2>/dev/null; cat .pre-commit-config.yaml 2>/dev/null | head -20
# Find PR template
cat .github/pull_request_template.md 2>/dev/null
```
-->

REPLACE: development workflow description

## Project Structure Guide

<!-- ORACLE:STRUCTURE
Provide a navigational guide to the codebase. For each top-level directory:
- What it contains
- When you'd look there
- Key files to know about

Tools:
- Read codebase_map.json for module structure
- List top-level directories
- Read existing ARCHITECTURE.md or STRUCTURE.md if present

```bash
# List top-level structure
ls -d */ 2>/dev/null
# Get module info from codebase map
cat docs/codebase_map.json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
modules = data.get('modules', [])
for m in modules:
    print(f\"{m.get('name', '?')}: {m.get('description', '?')}\")
"
```
-->

```
REPLACE_PROJECT_NAME/
├── REPLACE_DIR/     # REPLACE: what this contains
├── REPLACE_DIR/     # REPLACE: what this contains
└── REPLACE_DIR/     # REPLACE: what this contains
```

## Common Tasks

<!-- ORACLE:TASKS
Provide copy-pasteable recipes for frequent developer tasks.
Cover at minimum:
- Add a new feature (where to create files, what to wire up)
- Fix a bug (how to reproduce, where to look)
- Add a test (where tests go, how to run one test)
- Add a dependency (package manager command)
- Run a specific test file

Tools:
- Read package.json / Makefile for available commands
- Read test config for test run commands
- Read README / CONTRIBUTING for task guidance

```bash
# List all available scripts/targets
cat package.json 2>/dev/null | python3 -c "
import json, sys
scripts = json.load(sys.stdin).get('scripts', {})
for k, v in sorted(scripts.items()): print(f'  npm run {k}: {v}')
"
grep "^[a-zA-Z_-]*:" Makefile 2>/dev/null | sed 's/:.*//' | while read t; do echo "  make $t"; done
```
-->

### Add a new feature
```bash
REPLACE: step-by-step commands
```

### Run a specific test
```bash
REPLACE: test run command
```

### Add a dependency
```bash
REPLACE: package manager command
```

## Environment Setup

<!-- ORACLE:ENV
Document environment variables and configuration files needed:
- Required vs optional variables
- Where to get values (what service, what dashboard)
- Local service dependencies (database, Redis, message queue)

Tools:
- Read .env.example for variable inventory
- Grep for env var usage across codebase
- Read docker-compose for local service dependencies

```bash
# List env vars from template
cat .env.example .env.template .env.sample 2>/dev/null | grep -v "^#" | grep "=" | sed 's/=.*//'
# Find local service dependencies
cat docker-compose* 2>/dev/null | grep "image:" | sed 's/.*image: //'
```
-->

REPLACE: environment setup instructions

## Troubleshooting

<!-- ORACLE:TROUBLESHOOTING
Document common issues new developers encounter:
- Build failures (missing dependencies, version mismatches)
- Runtime errors (missing env vars, connection failures)
- Test failures (database not running, port conflicts)
- Platform-specific issues (macOS vs Linux, Docker Desktop quirks)

Tools:
- Read existing troubleshooting docs
- Read GitHub issues for common problems
- Grep for common error messages in code comments

```bash
# Find troubleshooting docs
find . -name "TROUBLESHOOTING*" -o -name "FAQ*" -o -name "KNOWN_ISSUES*" 2>/dev/null
# Find common error messages
grep -rn "common error\|known issue\|workaround\|troubleshoot" README.md CONTRIBUTING.md 2>/dev/null
```
-->

| Problem | Cause | Solution |
|---------|-------|----------|
| REPLACE | REPLACE | REPLACE |

<!-- ORACLE:MORE_ISSUES
Add more rows for common troubleshooting scenarios.
Delete this comment when done.
-->
