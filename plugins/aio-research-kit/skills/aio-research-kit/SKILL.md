---
name: aio-research-kit
description: Run structured 10-phase research workflows via research-cli (auto-installs if missing). Triggers: "start research", "research a topic", "create research project", "structured research", research-kit.
context: fork
agent: Explore
---

# Research Kit Skill

## Environment
- research: !`which research 2>/dev/null || echo "NOT INSTALLED"`
- uv: !`which uv 2>/dev/null || echo "NOT INSTALLED"`
- python3: !`which python3 2>/dev/null || echo "NOT INSTALLED"`

Structured 10-phase research framework via [nguyenvanduocit/research-kit](https://github.com/nguyenvanduocit/research-kit).

## Step 1: Check Availability

Check if `research` CLI is installed:

```bash
which research
```

If found → skip to **Step 3: Use CLI**. If not → proceed to **Step 2: Install**.

**Note:** Research Kit is a Python CLI tool, not an MCP server.

## Step 2: Install

### 2a. Install via uv (recommended)

```bash
uv tool install research-cli --force --from git+https://github.com/nguyenvanduocit/research-kit.git
```

### 2b. Install via pip

```bash
pip install git+https://github.com/nguyenvanduocit/research-kit.git
```

### 2c. Environment Variables (optional)

For AI-assisted reasoning during research:

```bash
# DeepSeek R1 reasoning
export DEEPSEEK_API_KEY="your-deepseek-key"

# OR Gemini reasoning
export GOOGLE_AI_API_KEY="your-google-ai-key"
```

## Step 3: Use CLI

### Initialize a Research Project

```bash
research init
```

This creates a structured research directory with the 10-phase template:

1. **Phase 1: Question Formulation** — Define research questions
2. **Phase 2: Literature Review** — Survey existing knowledge
3. **Phase 3: Hypothesis Formation** — Develop testable hypotheses
4. **Phase 4: Methodology Design** — Plan research approach
5. **Phase 5: Data Collection** — Gather evidence
6. **Phase 6: Data Analysis** — Analyze findings
7. **Phase 7: Interpretation** — Draw conclusions
8. **Phase 8: Validation** — Verify results
9. **Phase 9: Documentation** — Write up findings
10. **Phase 10: Peer Review** — External validation

### Validate Research Structure

```bash
research check
```

Validates that the research project follows the correct structure and all required sections are present.

## How to Conduct Research

### Step-by-Step Workflow

1. **Initialize**: `research init` in your project directory
2. **Define scope**: Edit Phase 1 to clearly state research questions
3. **Gather sources**: Use Phase 2 to document existing literature and references
4. **Form hypotheses**: Phase 3 — what do you expect to find?
5. **Design approach**: Phase 4 — how will you investigate?
6. **Collect data**: Phase 5 — gather evidence systematically
7. **Analyze**: Phase 6 — look for patterns, statistical significance
8. **Interpret**: Phase 7 — what do the results mean?
9. **Validate**: Phase 8 — cross-check findings
10. **Document**: Phase 9 — write comprehensive report
11. **Review**: Phase 10 — get external feedback
12. **Validate**: `research check` to ensure completeness

### Research Best Practices

- Start with clear, specific questions (Phase 1)
- Document all sources with citations (Phase 2)
- Keep hypotheses falsifiable (Phase 3)
- Separate data collection from analysis (Phase 5 vs 6)
- Include negative results (Phase 7)
- Have someone else review (Phase 10)

## Common Workflows

### Technical Research

1. `research init`
2. Phase 1: "What is the performance impact of switching from REST to gRPC?"
3. Phase 2: Benchmark studies, existing comparisons
4. Phase 5: Run benchmarks, collect metrics
5. Phase 6: Compare latency, throughput, resource usage
6. Phase 9: Write recommendation with data

### Market Research

1. `research init`
2. Phase 1: "What features do competitors offer in this space?"
3. Phase 2: Survey competitor products
4. Phase 5: Feature matrix, pricing data
5. Phase 7: Gap analysis, opportunity identification
