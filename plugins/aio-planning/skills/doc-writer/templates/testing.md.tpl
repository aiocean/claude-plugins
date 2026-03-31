# Testing Strategy

<!-- ORACLE:INSTRUCTIONS
This doc is filled by the quality-analyst.
Only generated when test files, test configs, or test directories are found.

Tools to use:
- Glob: find test files — "**/*_test.*", "**/*.test.*", "**/test_*", "**/*_spec.*", "**/__tests__/**"
- Glob: find test config — "jest.config*", "vitest.config*", "pytest.ini", "pyproject.toml", ".mocharc*", "karma.conf*", "cypress.config*", "playwright.config*"
- Read: each test config file to understand framework setup
- Grep: find test utilities — "mock", "stub", "fixture", "factory", "faker", "testutil"
- Grep: find test patterns — "describe(", "it(", "test(", "func Test", "def test_", "@Test"
- Read: CI config for test commands and parallelization

Discovery commands:
```bash
# Find test files
find . -name "*_test.*" -o -name "*.test.*" -o -name "test_*" -o -name "*_spec.*"
# Find test config
ls jest.config* vitest.config* pytest.ini pyproject.toml .mocharc* karma.conf* cypress.config* playwright.config* 2>/dev/null
# Count test files per module
find . -name "*test*" -type f | sed 's|/[^/]*$||' | sort | uniq -c | sort -rn
```
-->

## Test Architecture Overview

<!-- ORACLE:ARCHITECTURE
Describe the testing pyramid for this project:
- Unit tests: count, frameworks, where they live
- Integration tests: count, what they integrate
- E2E tests: count, frameworks (Cypress, Playwright, Selenium, etc.)
- Other: snapshot tests, contract tests, performance tests

Tools:
- Glob for test files grouped by type
- Read test config files to identify frameworks
- Grep for test runner commands in package.json / Makefile / CI config

```bash
# Identify test frameworks from config
cat package.json 2>/dev/null | python3 -c "
import json, sys
pkg = json.load(sys.stdin)
deps = {**pkg.get('devDependencies', {}), **pkg.get('dependencies', {})}
frameworks = [k for k in deps if any(t in k for t in ['jest', 'vitest', 'mocha', 'cypress', 'playwright', 'testing-library', 'pytest', 'unittest'])]
for f in frameworks: print(f)
"
```

```bash
# Count tests by type (unit vs integration vs e2e)
find . -path "*/unit/*" -name "*test*" | wc -l
find . -path "*/integration/*" -name "*test*" | wc -l
find . -path "*/e2e/*" -name "*test*" | wc -l
```
-->

| Layer | Framework | Count | Location |
|-------|-----------|-------|----------|
| REPLACE | REPLACE | REPLACE | REPLACE |

## Test-to-Component Mapping

<!-- ORACLE:MAPPING
Map test files to the high-risk hubs identified in codebase_map.json.
For each hub component, check whether test coverage exists.

Tools:
- Read codebase_map.json for hub components
- Grep for import/require of hub modules within test files
- Glob for test files adjacent to hub source files

```bash
# Cross-reference hubs with test files
cat docs/codebase_map.json 2>/dev/null | python3 -c "
import json, sys
data = json.load(sys.stdin)
hubs = data.get('hubs', [])
for hub in hubs:
    path = hub.get('path', '')
    name = path.rsplit('/', 1)[-1].rsplit('.', 1)[0] if path else ''
    print(f'Hub: {path} -> test pattern: *{name}*test*')
"
```
-->

| Component | Test File(s) | Coverage |
|-----------|-------------|----------|
| REPLACE | REPLACE | REPLACE |

## Coverage Gaps

<!-- ORACLE:GAPS
Identify high-complexity or high-coupling components WITHOUT test coverage.
Cross-reference codebase_map.json hubs/high-complexity files against test file mapping.

Focus on:
- Hub files (high fan-in/fan-out) with no corresponding test
- Files with high cyclomatic complexity but no tests
- Entry points (main, handlers, controllers) without integration tests
- Error paths and edge cases not exercised

```bash
# Find source files with no matching test file
find . -name "*.go" -o -name "*.ts" -o -name "*.py" | while read f; do
  base=$(basename "$f" | sed 's/\.[^.]*$//')
  tests=$(find . -name "*${base}*test*" -o -name "*test*${base}*" 2>/dev/null)
  [ -z "$tests" ] && echo "NO TEST: $f"
done
```
-->

REPLACE: list of coverage gaps with risk assessment

## Test Infrastructure

<!-- ORACLE:INFRA
Document shared test utilities, fixtures, and patterns:
- Test helpers / utilities (shared setup, custom matchers)
- Fixtures / factories (test data creation)
- Mocks / stubs (external service mocks, DB mocks)
- Test database setup (in-memory, containers, migrations)

Tools:
- Glob: find test utility files — "**/testutil*", "**/test-utils*", "**/helpers/*", "**/fixtures/*", "**/factories/*", "**/__mocks__/**"
- Read: shared test setup files (setupTests.*, conftest.py, TestMain)
- Grep: find mock patterns — "mock", "stub", "spy", "fake", "nock", "msw"

```bash
# Find test utilities and helpers
find . -name "testutil*" -o -name "test-utils*" -o -name "test_helper*" -o -name "conftest*" -o -name "setup*test*"
# Find mock/fixture directories
find . -type d \( -name "__mocks__" -o -name "fixtures" -o -name "factories" -o -name "testdata" \)
```
-->

REPLACE: test infrastructure description

## CI Test Pipeline

<!-- ORACLE:CI_TESTS
Document how tests run in CI:
- Which CI system (GitHub Actions, GitLab CI, Jenkins, etc.)
- Test commands executed
- Parallelization strategy (split by file, by module, sharding)
- Flaky test handling (retries, quarantine)
- Test result reporting (JUnit XML, coverage uploads)

Tools:
- Read CI config files (.github/workflows/*.yml, .gitlab-ci.yml, etc.)
- Grep for test commands in CI config — "test", "jest", "pytest", "go test"
- Grep for retry/flaky handling — "retry", "flaky", "rerun", "attempts"

```bash
# Find CI test configuration
grep -r "test\|jest\|pytest\|go test\|npm test" .github/workflows/*.yml .gitlab-ci.yml Makefile 2>/dev/null
# Find retry/flaky handling
grep -r "retry\|flaky\|rerun\|attempts" .github/workflows/*.yml .gitlab-ci.yml 2>/dev/null
```
-->

REPLACE: CI test pipeline description

## Testing Recommendations

<!-- ORACLE:RECOMMENDATIONS
Based on the analysis above, provide actionable recommendations:
- Critical coverage gaps to close first (highest-risk untested components)
- Test infrastructure improvements (missing factories, better mocks)
- Test performance improvements (parallelization, selective running)
- Missing test types (if no e2e, no integration, no contract tests)

Prioritize by impact: what would catch the most bugs with the least effort?
Delete this comment when done.
-->

REPLACE: prioritized testing recommendations
