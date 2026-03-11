# Key Flows

<!-- ORACLE:INSTRUCTIONS
This doc is filled by the flow-analyst.
Identify 3-5 critical execution paths in the codebase.
Each flow gets a description + Mermaid sequence diagram.

How to identify key flows:
1. Look at entry points (main, server start, CLI commands)
2. Find the most important user actions (login, create, process, etc.)
3. Check test files for integration tests — they often test key flows
4. Look for README usage examples
5. **Check CodeIndex module docs** - they often contain sequence diagrams!

Primary data sources:
1. **CodeIndex module docs** - docs/{module}.md files often have sequence diagrams
2. Tree-sitter: docs/.tree-sitter-results.json (function discovery)
3. LSP: goToDefinition, outgoingCalls for tracing

IMPORTANT:
- CodeIndex outputs to docs/, NOT .codeindex-cache/
- call_graph.json does NOT exist in CodeIndex output
- Use CodeIndex module docs for pre-built sequence diagrams
- Use LSP outgoingCalls for tracing call chains

For each flow:
1. Name it clearly (e.g., "User Authentication", "Order Processing")
2. Describe what triggers it and what the outcome is
3. List participants (User, API, Service, DB, External System, etc.)
4. Trace step by step with request/response arrows
5. Include error/alternative paths using alt/else blocks
-->

## REPLACE: Flow 1 Name

<!-- ORACLE:FLOW
Describe: what triggers this flow, what is the expected outcome.

**FIRST: Check CodeIndex module docs for existing sequence diagrams:**
```bash
# Look for sequence diagrams in module docs
grep -l "sequenceDiagram" docs/*.md
```

If found, extract and adapt the Mermaid sequence diagram from the module doc.

**For tracing call chains, use LSP:**
- LSP outgoingCalls from the entry point
- Read each function to understand what it does

**Or use Tree-sitter (if available):**
```bash
cat docs/.tree-sitter-results.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
# Find functions with most calls
for path, info in list(data.get('files', {}).items())[:5]:
    funcs = info.get('functions', [])
    print(f'{path}: {len(funcs)} functions')
"
```

Sequence diagram syntax:
```
sequenceDiagram
    actor User
    participant Component1 as Display Name
    participant Component2 as Display Name

    User->>Component1: Action description
    Component1->>Component2: Method call
    Component2-->>Component1: Return value
    Component1-->>User: Response

    alt Success case
        Component1-->>User: 200 OK
    else Error case
        Component1-->>User: 400 Error
    end
```
-->

REPLACE: 1-2 sentence description of this flow

```mermaid
sequenceDiagram
    REPLACE_PARTICIPANTS
    REPLACE_INTERACTIONS
```

## REPLACE: Flow 2 Name

<!-- ORACLE:FLOW_2
Same approach as Flow 1.
Check CodeIndex module docs for existing sequence diagrams.
Use LSP outgoingCalls for tracing.
-->

REPLACE: description

```mermaid
sequenceDiagram
    REPLACE_PARTICIPANTS
    REPLACE_INTERACTIONS
```

## REPLACE: Flow 3 Name

<!-- ORACLE:FLOW_3
Same approach as Flow 1.
Check CodeIndex module docs for existing sequence diagrams.
-->

REPLACE: description

```mermaid
sequenceDiagram
    REPLACE_PARTICIPANTS
    REPLACE_INTERACTIONS
```

<!-- ORACLE:MORE_FLOWS
Add more flow sections if 4-5 critical flows exist.
Prioritize flows that cross multiple layers or involve external systems.

Check CodeIndex module docs for additional sequence diagrams:
```bash
grep -l "sequenceDiagram" docs/*.md
```

Delete this comment when done.
-->
