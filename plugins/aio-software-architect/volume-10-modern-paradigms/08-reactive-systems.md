# Reactive Systems & Reactive Streams

> "A reactive system is not just about performance. It is about building systems that stay responsive under any condition — load, failure, network partitions — because they are designed for it from the ground up." — Jonas Bonér, creator of Akka

## The Problem

Traditional request-response architectures make an implicit assumption: the system will be available, the response will arrive quickly, and resources will be sufficient to handle the load. This assumption works for predictable, steady-state workloads. It fails spectacularly under real production conditions: traffic spikes exhaust thread pools, slow downstream services cascade into timeouts, a single component failure renders the entire system unresponsive, and scaling requires manual intervention after the damage is done.

The failure mode is familiar. A Black Friday traffic spike hits a retail website. The application server's thread pool fills with requests waiting for database responses. New requests queue behind them. The queue grows. Latency climbs from milliseconds to seconds. Users abandon their sessions. The database, now handling fewer concurrent queries, begins to recover — but the thread pool is still exhausted with queued requests that have already timed out client-side. The system is doing maximum damage (consuming all resources) while delivering minimum value (most responses are too late to matter).

The root cause is synchronous blocking I/O combined with thread-per-request resource models. A thread blocked waiting for a database response is a thread that cannot serve other users. At scale, the thread count required to handle peak concurrent requests exceeds what any JVM or OS thread scheduler can manage efficiently. The system runs out of threads before it runs out of work.

Reactive programming emerged as the answer to this class of problems. By treating computation as a response to events and data as streams with explicit backpressure, reactive systems can handle orders of magnitude more concurrent operations on the same hardware — because they never block a thread waiting for work that hasn't arrived yet. But reactive programming is complex, and reactive systems add architectural overhead. Understanding precisely when the trade-off is worthwhile is as important as understanding the technique itself.

## Core Concept

**The Reactive Manifesto**

The Reactive Manifesto (2013, signed by over 30,000 practitioners) defines four essential properties of reactive systems:

*Responsive*: The system responds in a timely manner if at all possible. Responsiveness means establishing reliable upper bounds on response time, detecting problems quickly, and dealing with them effectively. A responsive system builds user confidence.

*Resilient*: The system stays responsive in the face of failure. Resilience is achieved by replication, containment, isolation, and delegation. Failures are contained within each component, isolating components from each other. Recovery is delegated to another component. High-availability components, like critical UI elements, can be supervised and, if necessary, replicated.

*Elastic*: The system stays responsive under varying workload. Reactive systems react to changes in input rate by increasing or decreasing the resources allocated to serve these inputs. No contention points or central bottlenecks allow sharding or replication of components and distributing inputs among them. Reactive systems support predictive, as well as reactive, scaling algorithms.

*Message Driven*: Reactive systems rely on asynchronous message passing to establish a boundary between components that ensures loose coupling, isolation, and location transparency. This boundary also provides means to delegate failures as messages. Employing explicit message passing enables load management, elasticity, and flow control by shaping and monitoring the message queues in the system and applying back pressure when necessary.

The critical insight: these four properties reinforce each other. A system that is message-driven can be elastic (add consumers without changing producers). An elastic system can be resilient (add capacity before failures cascade). A resilient system can be responsive (failures don't propagate to user experience). Responsiveness is the observable outcome; message-driven, elastic, resilient architecture is what produces it.

**Reactive Streams: The Specification**

Reactive Streams is a specification (published 2015, adopted in Java 9 as java.util.concurrent.Flow) that defines the interoperability contract for asynchronous stream processing with non-blocking backpressure. It defines four interfaces:

```java
// Publisher: produces data
public interface Publisher<T> {
    void subscribe(Subscriber<? super T> subscriber);
}

// Subscriber: consumes data
public interface Subscriber<T> {
    void onSubscribe(Subscription subscription);
    void onNext(T item);
    void onError(Throwable throwable);
    void onComplete();
}

// Subscription: communication channel between Publisher and Subscriber
public interface Subscription {
    void request(long n);  // subscriber signals demand
    void cancel();
}

// Processor: both Publisher and Subscriber (transformation stage)
public interface Processor<T, R> extends Subscriber<T>, Publisher<R> {}
```

**Backpressure** is the critical innovation in Reactive Streams. When a subscriber is overwhelmed, it signals demand through `request(n)` — "I can handle n more items." A well-behaved publisher will not emit more than n items until the subscriber signals additional demand. This prevents the producer from overwhelming the consumer regardless of how fast the producer generates data.

Without backpressure, a fast producer connected to a slow consumer produces unbounded queue growth, OOM errors, and system instability. With backpressure, the slow consumer signals its capacity, the producer slows down, and the system remains stable under any load profile.

**Microsoft's Rx Origins**

Reactive Extensions (Rx) was created at Microsoft by Erik Meijer in 2009, originally for .NET (Rx.NET). Meijer's insight was the mathematical duality between IEnumerable (pull-based iteration, you call MoveNext) and IObservable (push-based notification, data is pushed to you). Every collection operation available for IEnumerable has a dual for IObservable: map, filter, reduce, zip, merge — all applicable to event streams as well as static collections.

Rx became RxJava (Netflix, 2012), then RxJS (Microsoft, 2015), and eventually influenced Project Reactor (Pivotal) and Akka Streams. The concept of composable, lazy stream operators with error handling and backpressure is the intellectual ancestor of the modern reactive ecosystem.

## Deep Dive

### The Reactive Manifesto (2013): Principles and Their Engineering Basis

The Reactive Manifesto, published in 2013 by Jonas Bonér, Dave Farley, Roland Kuhn, and Martin Thompson, codified four properties of reactive systems: Responsive, Resilient, Elastic, and Message-Driven. The manifesto's contribution was not the individual properties — non-blocking I/O, fault isolation, and dynamic scaling were all known engineering techniques — but the articulation of how these properties are interdependent and why message-driven communication is the architectural foundation that makes the other three achievable.

The case for message-driven as foundational rests on two arguments. First, message passing provides **location transparency**: a component that sends a message to an address does not need to know whether the recipient is local, remote, or on a different machine. This is the same property Agha formalized for the actor model, and it is what makes elastic scaling possible — new instances can be added to handle messages without changing the sender's code. Second, message passing enables **temporal decoupling**: the sender and receiver do not need to be available simultaneously. A synchronous RPC call requires both caller and callee to be available at the call instant; a message to a queue or mailbox can be processed when the receiver is ready. This temporal decoupling is what makes resilience achievable — a temporarily unavailable component does not cause cascading failure; messages queue and are processed when the component recovers.

Martin Thompson's contribution to the manifesto, informed by his LMAX Disruptor work, introduced the mechanical sympathy argument: thread-per-request models waste CPU cycles on context switching and cache invalidation at the OS thread boundary. A single thread processing events in a tight loop — the event loop pattern — maintains hot instruction and data caches, achieving memory access patterns that thread-based models cannot. The C10K problem (Dan Kegel, 1999) first quantified the thread-scaling limit: maintaining 10,000 concurrent connections with one OS thread each requires 80GB of stack space (assuming 8MB default stack per thread) and overwhelms the OS scheduler. Non-blocking I/O with an event loop handles C10K trivially on a single thread, motivating the shift to reactive programming models.

### Reactive Streams Specification: The Backpressure Standard

The Reactive Streams specification (Bonér, Klang, Tibbutt, Thompson, Verbelen, 2014) solved the interoperability problem that existed when RxJava, Akka Streams, and Project Reactor each implemented non-blocking stream processing with incompatible APIs. The specification defines four interfaces — Publisher, Subscriber, Subscription, and Processor — with precise semantics for the demand-signaling protocol between them.

The core insight of the Reactive Streams protocol is **pull-push duality for flow control**. In a pure push model, a fast publisher overwhelms a slow subscriber — the subscriber's buffer grows unboundedly until memory exhaustion. In a pure pull model, the subscriber requests one item at a time, limiting throughput to one round-trip latency per item. Reactive Streams threads a middle path: the subscriber signals demand in batches (`request(N)` — "send me up to N items"), the publisher sends up to N items, and the subscriber requests more when ready. This is structurally identical to TCP's receive window mechanism, applied at the application layer. The specification's achievement was defining this protocol precisely enough that a Reactive Streams-compliant publisher can pipe data into a Reactive Streams-compliant subscriber without either party knowing the other's implementation.

The Java 9 `java.util.concurrent.Flow` interfaces, introduced in JSR-166 (Doug Lea, 2017), are a verbatim copy of the Reactive Streams interfaces into the Java standard library — a formal recognition that demand-signaling stream processing is a foundational concurrency primitive. This standardization resolved the interoperability problem: Project Reactor, RxJava 2+, and Akka Streams all implement `java.util.concurrent.Flow` compatibility, allowing pipelines to cross framework boundaries.

### The C10M Problem and the Limits of the Reactive Model

The reactive model's concurrency efficiency, while dramatically better than thread-per-request for I/O-bound workloads, has well-defined limits analyzed in Robert Graham's "C10M: Defending the Internet at Scale" (2013). Graham argues that the C10K problem was solved by event-driven I/O (epoll, kqueue), but that C10M (10 million concurrent connections) requires architectural changes beyond the application layer — specifically, moving packet processing out of the OS kernel and into user space.

The kernel network stack, even with non-blocking I/O, incurs per-packet overhead from the system call boundary, memory copies between kernel and user space, and interrupt-driven scheduling. At 10 million connections with typical web traffic patterns, this overhead saturates the system before application code becomes the bottleneck. The DPDK (Data Plane Development Kit) and RDMA (Remote Direct Memory Access) approaches bypass the kernel for packet I/O entirely, processing network packets in user space at line rate — but at the cost of losing the kernel's socket abstraction that reactive frameworks rely on.

For the overwhelming majority of production services, the reactive model's performance envelope — roughly 1-10 million requests per second on commodity hardware — is more than sufficient. The C10M boundary is relevant for network infrastructure components (load balancers, proxies, IoT brokers) rather than application logic. The practical implication for reactive architecture is understanding where in the performance envelope a system sits: a service processing tens of thousands of concurrent connections benefits enormously from reactive programming; a service processing hundreds of requests per second gains negligible throughput benefit at the cost of significantly increased code complexity. The responsiveness and resilience properties of reactive systems remain valuable at any scale, but the thread-efficiency argument for reactive applies only when thread-per-request throughput becomes the actual bottleneck.

## Implementation Guide

**Pattern 1: Reactive API Composition**

The most common reactive pattern: aggregate multiple async service calls without blocking threads.

```java
// Project Reactor: compose multiple service calls concurrently
public Mono<ProductPage> getProductPage(String productId, String userId) {
    Mono<Product> product = productService.findById(productId)
        .cache(); // cache to avoid double-fetching

    Mono<List<Review>> reviews = reviewService.findByProduct(productId)
        .collectList();

    Mono<UserPreferences> prefs = userService.getPreferences(userId)
        .defaultIfEmpty(UserPreferences.defaults()); // handle missing user

    Mono<Pricing> pricing = product.flatMap(p ->
        pricingService.getPrice(p.getSku(), userId));

    // All four calls run concurrently; page assembles when all complete
    return Mono.zip(product, reviews, prefs, pricing)
        .map(tuple -> ProductPage.builder()
            .product(tuple.getT1())
            .reviews(tuple.getT2())
            .preferences(tuple.getT3())
            .pricing(tuple.getT4())
            .build())
        .timeout(Duration.ofSeconds(2))         // overall timeout
        .onErrorResume(TimeoutException.class,  // graceful degradation
            e -> product.map(p -> ProductPage.minimal(p)));
}
```

**Pattern 2: Backpressure-Aware Stream Processing**

```java
// Handle a high-volume event stream with explicit backpressure strategy
public Flux<ProcessedEvent> processEventStream(Flux<RawEvent> source) {
    return source
        // Backpressure strategy: drop events when buffer full
        // Alternatives: buffer(maxSize), latest(), error()
        .onBackpressureLatest()

        // Group into windows for batch processing
        .window(Duration.ofSeconds(1))
        .flatMap(window -> window
            .collectList()
            .flatMap(batch -> processBatch(batch))
        )

        // Retry transient failures with exponential backoff
        .retryWhen(Retry.backoff(3, Duration.ofMillis(100))
            .filter(e -> e instanceof TransientException))

        // Emit a tombstone record and continue on permanent failures
        .onErrorContinue((e, event) ->
            log.error("Failed to process event: {}", event, e));
}
```

**Pattern 3: Reactive vs. Async/Await — When to Choose**

This is a common point of confusion. Both reactive streams and async/await avoid blocking threads. The difference:

- **Async/await**: Sequential composition of asynchronous operations. Easy to read, easy to debug. Best for: request-response flows, business logic with sequential dependencies, teams without reactive experience.
- **Reactive streams**: Compositional, lazy stream operators with backpressure. Best for: high-volume data streams, complex fan-out/fan-in, scenarios where backpressure propagation is required.

```java
// Async/await style (cleaner for simple flows):
public async Task<Order> ProcessOrder(OrderRequest request) {
    var inventory = await inventoryService.Check(request.Items);
    var payment = await paymentService.Charge(request.PaymentInfo);
    var shipment = await shippingService.Create(order);
    return new Order(inventory, payment, shipment);
}

// Reactive style (better for stream processing with backpressure):
public Flux<ProcessedRecord> processRecords(Flux<Record> records) {
    return records
        .groupBy(Record::getPartitionKey)
        .flatMap(group -> group
            .buffer(100)
            .flatMap(batch -> processBatch(group.key(), batch)));
}
```

For most API endpoints, async/await is the right choice. Reserve reactive streams for scenarios where you genuinely need stream composition, complex concurrency patterns, or backpressure propagation.

**Pattern 4: Resilience Patterns**

```java
// Circuit breaker + timeout + fallback: reactive resilience composition
public Mono<Recommendation[]> getRecommendations(String userId) {
    return recommendationService.get(userId)
        .timeout(Duration.ofMillis(500))
        .transformDeferred(CircuitBreakerOperator.of(circuitBreaker))
        .onErrorReturn(CallNotPermittedException.class, FALLBACK_RECS)
        .onErrorReturn(TimeoutException.class, FALLBACK_RECS)
        .doOnError(e -> metrics.increment("recommendations.error"));
}
```

## When to Use / When NOT to Use

**Reactive is appropriate when:**
- Your service makes many concurrent I/O calls (database, cache, downstream services) per request
- You are building streaming data pipelines that need backpressure (log processing, event streaming)
- Your service handles high concurrent connection counts (10,000+ concurrent WebSocket connections)
- You need fine-grained control over concurrency, buffering, and flow control

**Reactive adds unnecessary complexity when:**
- Your service has simple, sequential logic with few I/O calls
- Your team is not experienced with reactive programming — the learning curve is steep and reactive bugs (subscriber lifecycle errors, backpressure misconfiguration, cold vs. hot observable confusion) are subtle
- Your I/O is already fast and your thread pool is not a bottleneck
- You need easy debuggability — reactive stack traces are notoriously difficult to interpret

**Reactive vs. async/await:**
For most application developers, async/await (C# Task, JavaScript Promise, Python asyncio, Kotlin coroutines) provides 80% of reactive's benefits with 20% of its complexity. Start with async/await for non-blocking I/O. Graduate to reactive streams only when you need composable stream operators, backpressure, or complex concurrency patterns.

**When reactive systems add overhead without benefit:**
A simple CRUD service with a relational database and 100 RPS is not a reactive workload. Adding Project Reactor or RxJava to such a service adds cognitive overhead, debugging complexity, and a steeper learning curve for new team members — for no measurable benefit. Reactive is a tool for high-concurrency, I/O-intensive, streaming workloads. Not a universal programming model.

## Common Mistakes

**Mistake 1: Blocking inside reactive pipelines**
Calling a blocking operation (Thread.sleep, blocking I/O, synchronized) inside a reactive pipeline defeats the purpose entirely and can deadlock the event loop. Use `publishOn(Schedulers.boundedElastic())` to offload blocking calls to a separate thread pool if they are unavoidable.

**Mistake 2: Ignoring backpressure strategy selection**
Choosing the wrong backpressure strategy causes different failure modes: `onBackpressureBuffer()` without a bound causes OOM; `onBackpressureDrop()` silently loses data; `onBackpressureError()` causes pipeline failure on overflow. Choose the strategy appropriate for your data loss tolerance and downstream capacity.

**Mistake 3: Creating cold observables where hot are needed**
Cold observables replay the entire sequence to each subscriber. Hot observables (subjects, shared streams) multicast to all current subscribers. Attaching multiple subscribers to a cold network request causes the request to execute multiple times. Use `share()`, `publish()`, or `cache()` appropriately.

**Mistake 4: Not handling subscriber lifecycle**
Failing to dispose subscriptions causes memory leaks — the publisher holds a reference to the subscriber, preventing garbage collection. Always dispose subscriptions when the consuming component is destroyed. In Spring WebFlux, the framework handles this; in custom code, track and dispose Disposable objects.

**Mistake 5: Assuming reactive means microservices**
Reactive programming and microservices are orthogonal. A monolith can be reactive (Spring WebFlux monolith). A microservices architecture can be entirely synchronous blocking (Spring MVC microservices). Reactive is a programming model choice; microservices is a deployment model choice.

## Connections

- **Actor Model (Article 7, this volume)**: Akka Streams is built on Akka actors and brings Reactive Streams backpressure to actor-based systems. The actor model and reactive streams are complementary: actors provide the computation model, reactive streams provide the flow control.
- **Serverless Architecture (Article 6, this volume)**: Lambda's event-driven model aligns with reactive principles (message-driven, elastic) but without the stream composition and backpressure that reactive frameworks provide. For Lambda-based stream processing, Kinesis + Lambda approximates reactive stream semantics.
- **Distributed Systems (Volume 8)**: The Reactive Manifesto's resilience and elasticity properties directly address the distributed systems challenges of fault tolerance and horizontal scaling. The message-driven property implements the loose coupling required for independent component scaling.
- **DAPR (Article 9, this volume)**: DAPR's pub/sub building block implements the message-driven property of reactive systems — components communicate through messages, not direct calls. DAPR enables reactive system architecture patterns in polyglot microservice environments.

## Key Insights

1. **Backpressure is the distinguishing feature, not async.** Async/await also provides non-blocking execution, but without backpressure propagation. Reactive Streams' `request(n)` protocol is what enables stable system behavior under overload conditions. If your use case doesn't require backpressure, async/await is simpler and equally non-blocking.

2. **Reactive systems are designed for failure, not prevention.** The resilience property in the Reactive Manifesto means building systems that stay responsive when components fail — not systems that never fail. Circuit breakers, fallbacks, timeouts, and bulkheads are reactive resilience patterns that accept failure as normal and respond gracefully.

3. **The Reactive Manifesto's four properties are a system-level concern.** An individual microservice can be reactive in its programming model. But the Reactive Manifesto's properties — responsive, resilient, elastic, message-driven — apply to the system as a whole. A reactive service in a synchronous, brittle system architecture does not produce a reactive system.

4. **Reactive debugging is genuinely harder.** Stack traces in reactive pipelines show operator chain internals, not your application logic. Production debugging requires specialized tools (reactor-tools, blockhound) and a team fluent in reactive idioms. This cost is real and must be weighed against the performance benefits.

5. **Project Reactor, RxJava, and Akka Streams are all Reactive Streams compliant.** They interoperate at Reactive Streams boundaries. This means you can connect a Reactor Flux producer to an Akka Streams sink, or consume a Reactor source in RxJava. The specification exists precisely to enable this interoperability.

6. **The Netflix → industry pattern is the reliable signal.** Netflix built reactive architecture under genuine scale pressure, published their learnings, and the patterns they developed have proven valuable across the industry. When a pattern survives Netflix's production traffic, it has been stress-tested in ways that most organizations will never replicate. Follow the pattern; understand its origins before adapting it.
