# Deep Modules vs Shallow Modules

> "The best modules are those whose interfaces are much simpler than their implementations." — John Ousterhout, A Philosophy of Software Design

## The Problem

Consider two implementations of a cache. The first exposes a rich interface: `get`, `set`, `delete`, `getWithTTL`, `setWithTTL`, `setIfNotExists`, `getMultiple`, `setMultiple`, `deleteMultiple`, `clearByPrefix`, `getStats`, `resetStats`, `setEvictionPolicy`, `getEvictionPolicy`, `warmUp`, `flush`. Seventeen methods. Every caller must understand the semantics of each method, know which ones are safe to combine, and decide which variant fits their situation.

The second exposes three methods: `get(key)`, `set(key, value, options)`, `delete(key)`. Options is a simple object with sensible defaults. The implementation under the hood handles TTL, eviction, statistics, and multi-key operations — but none of this complexity surfaces to callers unless they need it.

Both implementations may be internally equivalent in sophistication. But the first one distributes its complexity outward, requiring callers to manage the aspects the module should manage for them. The second one absorbs its complexity inward, providing callers with a narrow surface through which they interact with a powerful implementation.

This distinction — between modules that have wide interfaces relative to their functionality and modules that have narrow interfaces relative to their functionality — is what John Ousterhout calls the deep module vs shallow module dichotomy. It is not a familiar framing. Most software engineering education focuses on decomposition: breaking large things into small things. Ousterhout's insight is that decomposition alone is not the goal. The goal is depth: the ratio of value provided to interface surface area required.

A codebase full of shallow modules is a codebase where the complexity of the implementation has been distributed outward to callers rather than absorbed by the modules themselves. This is not simplicity — it is relocated complexity. The total complexity in the system has not decreased; it has moved from inside modules to between modules, where it is harder to manage and harder to test.

## Core Concept

Ousterhout defines module depth along two dimensions that form a ratio:

**Interface complexity** is the cost imposed on callers. Every method, every parameter, every exception that can be thrown, every state the caller must track — all of this is interface complexity. A wide interface is one where the cost of calling the module is high: callers must understand many methods, track many preconditions, and handle many possible outcomes.

**Implementation complexity** is the cost borne by the module internally. Deep implementations have sophisticated internal mechanics that they hide from callers: state machines, caching strategies, retry logic, error normalization, data transformation.

A **deep module** has low interface complexity relative to high implementation complexity. Callers get a lot of value through a narrow door.

A **shallow module** has high interface complexity relative to low implementation complexity. Callers must learn a lot to get a little. The cost of interaction is high relative to the value provided.

The canonical example Ousterhout uses is the Unix file I/O interface. Five system calls: `open`, `read`, `write`, `seek`, `close`. Behind these five calls lies an implementation of remarkable complexity: virtual file systems that abstract across ext4, APFS, NTFS, and network file systems; inode structures, block allocation, journaling for crash recovery; page cache integration so frequently-read files are served from memory; concurrent access control; file descriptor lifetime management across fork and exec; device-specific driver integration. Thousands of engineers have worked on the Linux filesystem implementation over decades.

From a caller's perspective: `open`, `read`, `write`, `seek`, `close`. That is all you need to know to use any file system on any Unix system. The depth is extraordinary — the ratio of hidden implementation complexity to visible interface complexity is perhaps unmatched in software history.

### The Interface Surface Area Problem

Interface surface area is a form of coupling. Every method, every parameter, every exception that callers must handle is a dependency: callers depend on the continued existence and correct behavior of each interface element. When a module has seventeen methods, changing the semantics of any one of them is a breaking change. When a module has three methods, the compatibility surface is much smaller.

This is why wide interfaces resist change: every element of the interface has callers who depend on it. Narrow interfaces can evolve their implementations freely because the callers depend only on the narrow surface.

The shallow module problem often emerges from good intentions. "I want this to be testable" leads to decomposing a function into five smaller functions, each exposed in the module interface. "I want callers to have control" leads to adding parameters and overloads. "I want to expose all the power of the underlying implementation" leads to pass-through methods that add no value.

Each of these is a form of pushing complexity outward — of deciding that callers should manage complexity that the module could manage for them.

### General-Purpose Interfaces Are Deeper

Ousterhout makes a counterintuitive argument: general-purpose interfaces tend to be deeper than special-purpose ones. A general-purpose interface must abstract over many use cases, which forces it to identify the core operations that underlie all of them — and to expose only those. A special-purpose interface, designed for a specific use case, exposes exactly the operations needed for that use case — and often exposes the implementation choices made for that use case as well.

The Unix file I/O example again: `read` and `write` operate on byte arrays. They do not know about lines, records, JSON, or CSV. This general-purpose design is what makes the interface usable for every file format ever invented. A special-purpose "read a line of text" interface would be narrower in the sense of being task-specific, but it would be shallower in the sense of hiding less from callers — callers would need separate interfaces for reading JSON, reading binary data, reading fixed-width records.

The implication for module design: when designing an interface, ask whether the operations you are exposing are the fundamental primitives of the domain, or whether they are specific use cases that could be expressed in terms of more general primitives. General primitives tend to produce deeper modules.

### Defining Errors Out of Existence

One of Ousterhout's most memorable concepts is "defining errors out of existence." A shallow module approach to error handling is to throw an exception for every possible error condition, requiring callers to handle each one. A deep module approach is to design the interface so that many error conditions simply cannot occur.

His example: `delete` on a file that does not exist. A shallow interface throws `FileNotFoundException`, requiring callers to check whether the file exists before deleting or to catch the exception. A deep interface defines `delete` to succeed if the file does not exist — the semantics are "ensure this file does not exist." With this definition, the error condition of "the file you are deleting does not exist" is defined out of existence. Callers do not need to handle it because it cannot happen.

This pattern applies broadly. An interface that accepts a timeout parameter that can be zero or negative must either validate it and throw an error, or define "zero or negative means no timeout" and absorb the edge case. The second option eliminates an error class entirely at the interface level, reducing caller complexity without reducing functionality.

Kubernetes applies this pattern extensively in its API. Creating a resource that already exists does not throw an error — it idempotently applies the desired state. Deleting a resource that does not exist does not throw an error — the desired state (resource absent) is already achieved. The error class "resource already exists/does not exist" is defined out of existence by the interface semantics. This is why Kubernetes controllers can apply the same manifest repeatedly without worrying about state — the interface is designed so that idempotent application is correct by construction.

### The "Many Small Classes" Anti-Pattern

Ousterhout directly challenges the "many small classes" dogma that has dominated object-oriented programming culture since the rise of Java. The advice "a class should do one thing" or "extract any reusable logic into its own class" produces shallow modules when applied without consideration of depth.

A class that is three lines long does one thing — but if that thing is also done by its caller, and if calling it requires understanding its one thing in addition to the caller's context, the extraction has increased complexity rather than reduced it. Navigation complexity — the cost of understanding which of twenty small classes to call, how they relate to each other, and in what order — can exceed the complexity of a single well-commented fifty-line function.

The test is not "how small is this?" but "does this boundary add value for its callers?" Does the abstraction hide something they should not need to know? Does it represent a concept that has coherent semantics independently of its callers? If yes, the decomposition is valuable. If no — if the "module" is just named code that happens to live in a separate file — it is shallow, and the decomposition is adding indirection without adding depth.

This does not advocate for large classes or functions. It advocates for decomposing along lines that produce depth, not along lines that produce smallness for its own sake. A well-designed module can be fifty lines or five hundred lines; the size is not the property being optimized.

## Deep Dive

The deep versus shallow module distinction is one of Ousterhout's most practically useful concepts, and it appears — often implicitly — throughout the engineering literature produced by organizations that have designed interfaces used by thousands or millions of developers. Examining where depth has been achieved, and what made it possible, reveals the design discipline required to build genuinely deep interfaces.

### The "Software Engineering at Google" Perspective: Depth at Framework Scale

Google has designed several widely-used frameworks and protocols whose interface design embodies the deep module principle in ways that are worth studying directly. The gRPC framework is the clearest example.

A caller invoking `stub.GetUser(request)` through a gRPC-generated client interacts with what appears to be a simple remote procedure call. The implementation beneath this interface is substantially more complex: channel lifecycle management, connection pooling across a cluster of backends, client-side load balancing with multiple policy options, deadline propagation across the call chain, interceptor chains for logging and authentication, flow control between sender and receiver, optional compression, and TLS negotiation. None of this is visible to the caller. The interface is a thin, typed surface; the implementation is a complete network communication stack.

What makes gRPC instructive as a deep module design is the deliberate decision about what goes inside the interface versus what is exposed. Callers can configure the channel — they can specify deadline policy, interceptors, and load balancing policy through builder parameters — but they manage none of the resulting complexity directly. The builder parameters are the narrow interface surface; the implementations those parameters select are absorbed entirely by the framework. This is the depth ratio: substantial configuration options expressed through a narrow builder API, over an implementation that handles the actual complexity.

Protocol Buffers applies the same principle to serialization. The generated code exposes typed accessors for message fields. The wire format, field encoding, unknown field handling, cross-language compatibility, and backward/forward compatibility semantics are entirely internal to the implementation. A developer who uses Protocol Buffers can work for years without understanding the wire format. This is information hiding producing depth: the caller gets the benefit — typed, cross-language, forward-compatible serialization — without managing any of the implementation.

"Software Engineering at Google" documents the API design principles that produce these results. The emphasis on readability and clarity in interface design is not merely aesthetic — it is functional. An interface that is easy to understand is an interface that has successfully hidden what does not need to be understood. Interfaces that are hard to understand are usually hard to understand because they are exposing implementation details that callers should not need to know.

### The AWS Builder's Library Perspective: Depth as a Service Design Goal

Amazon's service design philosophy, documented across Builder's Library essays and SDK documentation, reflects deep module thinking applied at the service boundary level. The question Amazon's service designers repeatedly face is: what should a service expose, and what should it absorb internally? Their answers illuminate the depth principle.

The AWS SDK design demonstrates depth at the API client layer. The gap between what a caller writes — a few parameters specifying what they want — and what the SDK actually does is substantial. SigV4 request signing, endpoint selection for the correct region, retry logic with exponential backoff and jitter, connection pool management, response parsing and error normalization — all of this is absorbed by the SDK client. The interface contract is narrow: specify the operation and its parameters. The implementation contract covers the full complexity of interacting with a distributed cloud service.

The depth ratio matters here because it multiplies across every caller. If request signing were a caller responsibility, every application using the SDK would need to implement SigV4 signing correctly. A subtle bug in signing implementation would be replicated across thousands of applications. By absorbing signing into the SDK, Amazon ensures that the complexity is solved once and applied everywhere. The implementation complexity is concentrated where it can be managed — inside the SDK — rather than distributed where it cannot — across every caller.

Builder's Library essays on workflow orchestration document deep module design at the service level. A workflow service that exposes state definitions and transitions as the interface absorbs an enormous amount of execution complexity: durable state persistence across arbitrary time spans, retry logic for individual steps, parallel branch execution, error compensation, and integration across service boundaries. Callers express business intent — what states exist, what causes transitions — without managing execution mechanics. The depth is in the ratio between the simplicity of the state definition interface and the complexity of durable workflow execution.

The pattern of "defining errors out of existence" appears repeatedly in AWS service design, often without being named explicitly. Operations that are designed to be idempotent — where calling the same operation twice produces the same result as calling it once — eliminate an entire class of error handling at the caller. Rather than requiring callers to detect and handle "resource already exists" errors, idempotent creation operations simply succeed whether or not the resource previously existed. The error class is absorbed by the interface design, reducing the surface area callers must handle.

### The Microsoft .NET Architecture Perspective: Depth Through Language Integration

Microsoft's LINQ (Language Integrated Query) represents one of the most successful examples of deep module design in mainstream programming language history. The interface is remarkably narrow: `Where`, `Select`, `GroupBy`, `OrderBy`, `Join`, `Aggregate` — a handful of composable operations. The implementation depth is extraordinary.

The same LINQ expression — `collection.Where(x => x.Age > 18).OrderBy(x => x.Name)` — generates fundamentally different execution paths depending on the type of `collection`. Applied to an in-memory list, it executes as iterated filter and sort operations. Applied to an Entity Framework DbSet, it generates SQL WHERE and ORDER BY clauses that execute in the database. Applied to a remote LINQ provider, it may translate the expression tree into an entirely different query language. Callers write one expression; the implementation adapts to the execution context.

The depth is in this adaptability. The interface does not change when the underlying data source changes. Callers do not need to know whether they are querying memory or a database — the same operations work across all contexts. The interface absorbs the complexity of query translation, execution planning, and data source adaptation. The caller's only responsibility is expressing what they want; the implementation figures out how to get it.

Entity Framework Core extends this depth to the full ORM lifecycle. Change tracking — monitoring object graph mutations and generating minimal SQL to persist them — is entirely internal. The caller manipulates objects; the framework determines what database operations are required. This is substantial absorbed complexity: diffing object graphs against their original state, understanding relationship semantics, generating optimal SQL, handling concurrency. The caller sees object manipulation; the implementation manages database interaction.

The Roslyn compiler platform documents a different dimension of depth: providing a rich API over a complex implementation so that tooling authors can build on the compiler without understanding its internals. Roslyn exposes syntax trees, semantic models, and transformation APIs that make the compiler's understanding of code accessible to tooling. The complexity of parsing, name resolution, type checking, and code generation is absorbed by the compiler; tooling authors interact with well-typed data structures. The depth enables an ecosystem of analyzers, code generators, and refactoring tools that would be impractical if they needed to implement their own parsing.

### The Convergent Insight: Depth Is a Design Discipline, Not a Size Property

The consistent finding across these contexts is that deep modules are not produced by accident or by writing more code — they are produced by making explicit design decisions about what to absorb and what to expose. Every deeply designed interface represents a deliberate choice: this complexity stays inside, that interface element gets exposed.

The organizations that have produced the deepest interfaces — gRPC, Protocol Buffers, LINQ, AWS SDKs — made these choices explicitly and invested significantly in the implementations that made those choices possible. A deep interface requires a sophisticated implementation. The investment is real. The payoff — every caller benefiting from absorbed complexity rather than having to manage it themselves — is also real, and it compounds across every caller over the lifetime of the interface.

Shallow interfaces are often the result of not making this design discipline explicit. When engineers expose what they have built rather than what callers need, interfaces become wide. When implementation convenience drives interface design, implementation details leak. The shallow module problem is a symptom of designing interfaces from the inside out rather than from the caller's perspective in.

## Implementation Guide

**Evaluate every module you design by its depth ratio.** When a module is complete, ask: what does a caller need to know to use this correctly? How does that compare to what the module knows internally? If the answer is "almost as much as the module knows," the module is shallow. If the answer is "almost nothing relative to what it handles," the module is deep.

**Design the interface before the implementation.** Interfaces designed around implementation convenience tend to be shallow — they reflect the module's structure rather than the caller's needs. Interfaces designed around caller convenience tend to be deeper — they identify what callers actually need to know and hide everything else.

**Push error handling inward.** Every error condition that a caller must handle is interface complexity. When designing an interface, ask for each possible error: can I define this error out of existence by changing the semantics? Can I handle this internally and retry? Can I return a safe default instead of an error? Eliminate error classes at the interface level wherever semantics allow.

**Favor fewer, more general methods over many specific ones.** Before adding a new method to a module, ask: can this be expressed as a composition of existing methods? If yes, the new method is a convenience shortcut, not a fundamental operation. Convenience shortcuts add interface surface area without adding capability; consider whether they belong in the module itself or in a utility layer for callers who need the shortcut.

**Use sensible defaults aggressively.** Every parameter a caller must specify is interface complexity. Parameters with sensible defaults allow callers to use the most common behavior without specifying anything, while still permitting customization when needed. The `options` pattern — `func Get(key string, opts ...GetOption) (Value, error)` — provides depth through defaults while allowing depth-breaking customization when genuinely needed.

**Test depth at the interface level.** Write tests that use the module exactly as callers will use it, with no special access to internals. If tests require mocking internal components, hooking into private state, or calling multiple methods in specific sequences to set up state before calling the method under test, the interface is shallow — it is requiring callers (including tests) to manage state that the module should manage.

## When to Use

Deep module design is appropriate whenever you are creating a component that will have multiple callers over time. The investment in designing a deep interface pays off across every caller and over the lifetime of the module.

Deep modules are especially valuable at system boundaries — the interfaces between services, between layers, between teams — where interface complexity multiplies across team boundaries and is expensive to change after it has been established.

## When NOT to Use

Sometimes shallow interfaces are appropriate. An interface that is shallow because it is genuinely simple — because there is not much complexity to hide — is not a design failure, it is an accurate representation of the module's purpose. A utility function that adds two numbers has a shallow interface because there is no depth to provide.

Also, some domains genuinely require callers to make choices that cannot be defaulted. A database transaction interface that always auto-commits is not deep — it has made a choice that the caller should make. Sometimes exposure of options and control is the right design. The question is whether the exposure serves callers or serves the implementation's convenience.

## Common Mistakes

**Mistake 1: Conflating smallness with depth.** A small module is not necessarily a deep one. A five-line wrapper function that adds no value — no defaults, no error handling, no abstraction — is shallow regardless of its size. Depth is about ratio, not absolute size.

**Mistake 2: Pass-through modules.** A module that directly exposes the interface of a dependency it wraps adds interface surface area without adding depth. The caller now must learn two interfaces — the wrapper and the wrapped thing — for no added benefit. Either add value in the wrapper (transformation, error handling, logging, retry logic) or do not wrap.

**Mistake 3: Method proliferation.** Adding methods for every conceivable use case produces wide, shallow interfaces. Before adding a method, ask: is this a fundamental operation, or is it a composition of existing operations? If it is a composition, consider whether it belongs in the module itself or in a helper used by callers who need that composition.

**Mistake 4: Forcing callers to manage module state.** If callers must call method A before method B, or must check a property before calling a method, or must reset state between uses, the module is managing its state improperly. Deep modules manage their own state and expose stateless interfaces wherever possible.

**Mistake 5: Exposing implementation technology.** A module that returns SQL exceptions to callers, or whose API signature contains framework-specific types that callers must import, is exposing its implementation. This is shallow — it prevents the implementation from changing without breaking callers. Deep modules return domain-level errors and domain-level types, with implementation details hidden.

## Connections

- **Complexity Is What Matters** — Deep modules directly manage the three forms of complexity: wide interfaces cause change amplification, and shallow interfaces impose high cognitive load on callers. See article 01.
- **Separation of Concerns** — Identifying what belongs inside a module boundary is the prerequisite for making it deep; concerns that belong together should be handled inside the module, not distributed to callers. See article 08.
- **Boundaries Are the Architecture** — Module depth is determined by what crosses the boundary; deep modules expose only what callers need, hiding everything else at the boundary. See article 03.
- **Cognitive Load Is What Matters** — Shallow modules impose extraneous cognitive load on callers; deep modules minimize extraneous load by absorbing complexity inward. See article 12.

## Key Insights

1. The goal of decomposition is not smallness — it is depth. Small decompositions that produce shallow modules increase total system complexity; large modules that are genuinely deep decrease it.

2. The Unix file I/O interface is the existence proof that enormous implementation complexity can be hidden behind a five-method interface. Software engineering has no excuse for shallow abstractions when this example exists.

3. Defining errors out of existence is more powerful than handling them. Every error class that callers do not need to handle is a reduction in interface surface area. Interface design that eliminates error conditions is deeper than interface design that multiplies them.

4. "Many small classes" is good advice only when the resulting classes are deep. It is bad advice when the resulting classes are small, numerous, and shallow — when the complexity moves from inside modules to the spaces between them.

5. General-purpose interfaces tend to be deeper than special-purpose ones. Design for the general case; the specific cases can be expressed as compositions of general operations.

6. Depth is invisible to the caller, which is the point. The value of a deep module is precisely that callers do not see the implementation. This makes deep modules hard to appreciate in code review — the value is in what you do not see.

7. Interface design is the hardest part of module design, and the most important. Implementations can be changed; interfaces, once established, are expensive to change because callers depend on them. Invest more time in getting the interface right than in the initial implementation.
