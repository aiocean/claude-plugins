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
5. If CodeWiki is available, check call_graph.json for heavily-called functions

Primary data sources:
1. CodeWiki: .codewiki-cache/call_graph.json (function-level call relationships)
2. Tree-sitter: .tree-sitter-results.json (function discovery)
3. LSP: goToDefinition, outgoingCalls for tracing

Tools:
- CodeWiki call graph (preferred): precise caller→callee with line numbers
- LSP goToDefinition to trace call chains from entry → handler → service → data
- LSP outgoingCalls to map the call tree from each entry point
- Grep for route/handler definitions to find entry points
- Read test files for flow expectations

CodeWiki call_graph.json structure:
- relationships: [{caller, callee, call_line, is_resolved}]

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
Trace the execution path step by step.

**If CodeWiki is available, use call_graph.json for precise tracing:**
```bash
# Find all calls from an entry point
cat .codewiki-cache/call_graph.json | python3 -c "
import json, sys
from collections import defaultdict
d = json.load(sys.stdin)
# Build call tree
call_tree = defaultdict(list)
for rel in d.get('relationships', d.get('calls', [])):
    call_tree[rel.get('caller')].append({
        'callee': rel.get('callee'),
        'line': rel.get('call_line')
    })
# Trace from entry point
entry = 'module_name.function_name'
def trace(caller, depth=0):
    indent = '  ' * depth
    print(f'{indent}{caller}')
    for call in call_tree.get(caller, [])[:5]:  # limit breadth
        trace(call['callee'], depth + 1)
trace(entry)
"
```

**If using LSP:**
- LSP outgoingCalls from the entry point to map the call chain
- Read each function in the chain to understand what it does

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
Use CodeWiki call graph if available for precise function-level tracing.
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
Use CodeWiki call graph if available for precise function-level tracing.
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
Use CodeWiki call_graph.json to identify heavily-used execution paths.

To find important flows from CodeWiki:
```bash
# Find most-called functions (likely important)
cat .codewiki-cache/call_graph.json | python3 -c "
import json, sys
from collections import Counter
d = json.load(sys.stdin)
call_counts = Counter()
for rel in d.get('relationships', d.get('calls', [])):
    call_counts[rel.get('callee')] += 1
print('Most-called functions:')
for func, count in call_counts.most_common(20):
    print(f'  {func}: {count} callers')
"
```

Delete this comment when done.
-->
