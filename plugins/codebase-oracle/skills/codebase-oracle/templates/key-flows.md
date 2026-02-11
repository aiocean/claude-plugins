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

Tools:
- Grep for route/handler definitions to find entry points
- LSP goToDefinition to trace call chains from entry → handler → service → data
- LSP outgoingCalls to map the call tree from each entry point
- Read test files for flow expectations

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
Use LSP outgoingCalls from the entry point to map the call chain.
Read each function in the chain to understand what it does.

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

REPLACE: description

```mermaid
sequenceDiagram
    REPLACE_PARTICIPANTS
    REPLACE_INTERACTIONS
```

## REPLACE: Flow 3 Name

REPLACE: description

```mermaid
sequenceDiagram
    REPLACE_PARTICIPANTS
    REPLACE_INTERACTIONS
```

<!-- ORACLE:MORE_FLOWS
Add more flow sections if 4-5 critical flows exist.
Prioritize flows that cross multiple layers or involve external systems.
Delete this comment when done.
-->
