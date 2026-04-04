# gRPC and Protocol Buffers

> "gRPC is a modern open source high performance Remote Procedure Call (RPC) framework that can run in any environment." — grpc.io

## The Problem

REST over JSON is convenient but carries significant overhead that compounds at scale. Every HTTP/1.1 request opens a new TCP connection or waits for one to become available from a pool. Headers are sent as plaintext strings, often repeating the same `Content-Type`, `Authorization`, and `Accept` headers on every request — hundreds of bytes per call. JSON parsing is CPU-intensive: every field name is parsed as a string, types must be inferred from values, and schema validation requires a separate step. For a mobile app making 50 API calls per screen load, or a microservice handling 100,000 requests per second, this overhead is measurable and costly.

Streaming is even more constrained. A REST endpoint can return a response, but if you need to push a continuous stream of data to a client — live prices, sensor readings, log events — you are forced into polling (inefficient), Server-Sent Events (one-directional, browser-only), or WebSockets (requires a separate protocol, no standard RPC framing). There is no first-class story for bidirectional streaming in the REST model.

Type safety across service boundaries is a persistent maintenance burden. A JSON API has no enforcement mechanism. If the server changes a field from `int` to `string`, or renames `userId` to `user_id`, clients fail at runtime with cryptic parse errors. Type checking happens in the client application layer, not at the protocol layer. In polyglot microservice environments — Go services calling Python services calling Java services — maintaining consistency requires discipline that humans consistently fail to apply.

gRPC solves all three problems: it uses HTTP/2 for efficient multiplexed transport, Protocol Buffers for compact binary serialization with enforced schemas, and generates type-safe client and server code in every major language from a single schema definition.

## Core Concept

gRPC is a framework built on two foundational technologies: **HTTP/2** for transport and **Protocol Buffers** (Protobuf) for serialization. Understanding each separately clarifies why gRPC performs the way it does.

### HTTP/2

HTTP/2, standardized in 2015, solves the fundamental inefficiencies of HTTP/1.1:

**Multiplexing**: Multiple requests and responses can be in-flight simultaneously over a single TCP connection. HTTP/1.1 required one connection per in-flight request. With HTTP/2, a single connection handles hundreds of concurrent streams, eliminating the connection establishment overhead that dominates low-latency environments.

**Header Compression (HPACK)**: HTTP/2 compresses headers using a shared compression context maintained across requests. After the first request, repeated headers like `content-type: application/grpc` are represented as a single byte instead of 27. In microservice environments where thousands of small requests fly between services, this reduces bandwidth by 85-90% for header-heavy workloads.

**Binary Framing**: HTTP/2 is a binary protocol at the transport layer. Frames have defined types (DATA, HEADERS, SETTINGS, PING) and are parsed with bit operations rather than string scanning. This is faster and less ambiguous than HTTP/1.1's text-based protocol.

**Server Push**: The server can proactively send resources the client will need without waiting for a request. gRPC does not use server push (it is superseded by gRPC's streaming model), but the capability exists in the protocol.

### Protocol Buffers

Protocol Buffers is a language-neutral serialization format defined by schema files (`.proto` files). The schema is the contract:

```protobuf
syntax = "proto3";

package ecommerce.v1;

option go_package = "github.com/company/api/gen/go/ecommerce/v1";
option java_package = "com.company.api.ecommerce.v1";

// The Order service manages order lifecycle.
service OrderService {
  // Creates a new order.
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  
  // Lists orders matching the given filter.
  rpc ListOrders(ListOrdersRequest) returns (ListOrdersResponse);
  
  // Streams real-time status updates for an order.
  rpc WatchOrder(WatchOrderRequest) returns (stream OrderStatusUpdate);
  
  // Processes a batch of order operations.
  rpc BatchProcessOrders(stream OrderOperation) returns (BatchProcessResponse);
  
  // Full bidirectional stream for high-frequency trading scenarios.
  rpc StreamOrders(stream OrderRequest) returns (stream OrderResponse);
}

message Order {
  string name = 1;              // Resource name: orders/{order_id}
  string user_id = 2;
  OrderStatus status = 3;
  repeated OrderItem items = 4;
  Money total_amount = 5;
  google.protobuf.Timestamp create_time = 6;
  google.protobuf.Timestamp update_time = 7;
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;
  ORDER_STATUS_PENDING = 1;
  ORDER_STATUS_CONFIRMED = 2;
  ORDER_STATUS_FULFILLED = 3;
  ORDER_STATUS_CANCELLED = 4;
}

message Money {
  string currency_code = 1;
  int64 units = 2;
  int32 nanos = 3;
}
```

The `protoc` compiler generates code from this schema in Go, Java, Python, C++, Ruby, PHP, C#, and more. The generated code includes:
- Request and response message types with typed fields
- Client stubs that make RPC calls
- Server interfaces that you implement
- Serialization/deserialization logic

What you do not write: HTTP routing, JSON parsing, connection management, content negotiation, or retry logic. The generated code handles all of it.

### The Four Call Types

gRPC supports four communication patterns, all defined in the proto service definition:

**1. Unary**: One request, one response. This is the RPC equivalent of an HTTP request-response. Use for most operations — lookups, mutations, computations.

```protobuf
rpc GetOrder(GetOrderRequest) returns (Order);
```

**2. Server-Streaming**: One request, multiple responses. The server sends a stream of messages after receiving a single request. Use for subscriptions, large dataset retrieval, progress updates.

```protobuf
rpc WatchOrder(WatchOrderRequest) returns (stream OrderStatusUpdate);
```

**3. Client-Streaming**: Multiple requests, one response. The client sends a stream of messages and the server processes them to return a single response. Use for bulk uploads, aggregation operations, telemetry ingestion.

```protobuf
rpc BatchCreateOrders(stream CreateOrderRequest) returns (BatchCreateResponse);
```

**4. Bidirectional Streaming**: Both sides send a stream of messages independently. Use for real-time communication, collaborative editing, high-frequency data exchange.

```protobuf
rpc StreamPriceUpdates(stream PriceSubscription) returns (stream PriceUpdate);
```

## Deep Dive

Protocol Buffers' design choices reflect a specific set of priorities that distinguish it from JSON and XML. The most important is the separation between schema and wire format. A JSON document is self-describing: field names are present in every message, type information is inferred from value syntax. A Protocol Buffer message is not self-describing: field numbers identify fields (not names), types are defined in the schema, and the binary format contains no field names. This design choice produces messages that are 3-10x smaller than equivalent JSON and dramatically faster to parse — but it means the schema is required to interpret the message. There is no "read a protobuf without the .proto file." This trade-off is appropriate for microservice communication (where both sides have the schema) but inappropriate for situations where self-description matters (public APIs where clients may not have schema tooling, long-term log storage where schema evolution is complex).

The field numbering system in Protocol Buffers is the source of its backward and forward compatibility guarantees, and understanding it is essential to using Protocol Buffers correctly. Each field in a protobuf message has a unique integer tag (1, 2, 3...). The binary format encodes values with their tag number. When a new version adds field 4 to a message, old clients that receive the new message see an unknown field (tag 4) and ignore it. When an old version removes field 3 and a client with the new schema receives a message from an old server that still sends field 3, the new client sees an unknown field and ignores it. Both old-reads-new and new-reads-old work correctly because the field tags, not names, are the identity of each field. The critical implication: field tags can never be reused. If field 3 was a `string name` and you want to repurpose field 3 as an `int32 count`, old clients will try to interpret the new `int32` value as a `string`, producing nonsense or errors. Google's style guide mandates reserving removed field numbers to prevent accidental reuse.

The four streaming modes in gRPC represent four different communication patterns with genuinely different semantics. Unary RPC (single request, single response) maps directly to traditional function calls. Server streaming (single request, stream of responses) is appropriate for operations that return large datasets incrementally or for subscriptions where the client registers interest and the server pushes updates. Client streaming (stream of requests, single response) is appropriate for upload operations where the client sends a large dataset and the server returns a summary. Bidirectional streaming (stream of requests, stream of responses) is appropriate for real-time communication where both sides send messages independently — chat applications, collaborative editing, live telemetry. The choice among these modes should be driven by the communication pattern of the domain, not by technical preference. Bidirectional streaming is the most powerful but also the most complex to implement correctly, particularly around flow control and error handling.

Google's gRPC ecosystem contribution that most practitioners underestimate is the gRPC-gateway / HTTP transcoding pattern. A single `.proto` file with `google.api.http` annotations generates both a gRPC service and an HTTP/JSON REST API from the same definition. The proto file is the single source of truth: API structure, field types, documentation comments, and the mapping between RPC methods and REST endpoints are all defined once. Changing the proto file regenerates client libraries, server stubs, API documentation, and the REST transcoding layer simultaneously. This "proto-first" approach eliminates the divergence between gRPC and REST surfaces that otherwise requires maintaining two separate API definitions. The Google API Design Guide's recommendation to define APIs in Protocol Buffers before implementing them — using the proto file as the design document — is a direct application of this principle: the schema IS the specification.

The performance case for gRPC over REST+JSON is strongest in high-frequency microservice-to-microservice communication. In typical internal traffic patterns — thousands of requests per second between services, messages ranging from a few hundred bytes to a few kilobytes — gRPC's binary serialization saves 3-10x in message size and 2-5x in CPU time for serialization and deserialization compared to JSON. HTTP/2 multiplexing eliminates the head-of-line blocking problem that plagues HTTP/1.1 connection pools: a single slow request cannot block other requests sharing the same connection. For a service making 50,000 requests per second to a downstream dependency, the difference between HTTP/1.1+JSON and HTTP/2+Protobuf in CPU utilization and latency tail behavior is measurable and operationally significant. Sam Newman's *Building Microservices* recommends gRPC as the default for synchronous service-to-service communication precisely because of these characteristics, while noting that REST remains appropriate for public-facing APIs where client diversity and ease of integration matter more than raw performance.

## Implementation Guide

### Setting Up a gRPC Service (Go)

```go
// server/main.go
package main

import (
    "context"
    "log"
    "net"
    
    pb "github.com/company/api/gen/go/ecommerce/v1"
    "google.golang.org/grpc"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type orderServer struct {
    pb.UnimplementedOrderServiceServer
    store OrderStore
}

func (s *orderServer) GetOrder(ctx context.Context, req *pb.GetOrderRequest) (*pb.Order, error) {
    if req.Name == "" {
        return nil, status.Error(codes.InvalidArgument, "name is required")
    }
    
    order, err := s.store.Get(ctx, req.Name)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            return nil, status.Errorf(codes.NotFound, "order %q not found", req.Name)
        }
        return nil, status.Errorf(codes.Internal, "failed to get order: %v", err)
    }
    
    return order, nil
}

func (s *orderServer) WatchOrder(req *pb.WatchOrderRequest, stream pb.OrderService_WatchOrderServer) error {
    ch := s.store.Subscribe(req.Name)
    defer s.store.Unsubscribe(req.Name, ch)
    
    for {
        select {
        case update := <-ch:
            if err := stream.Send(update); err != nil {
                return err  // Client disconnected
            }
        case <-stream.Context().Done():
            return nil  // Client cancelled
        }
    }
}

func main() {
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatalf("failed to listen: %v", err)
    }
    
    s := grpc.NewServer(
        grpc.UnaryInterceptor(loggingInterceptor),
        grpc.StreamInterceptor(streamLoggingInterceptor),
    )
    pb.RegisterOrderServiceServer(s, &orderServer{store: newOrderStore()})
    
    log.Printf("server listening at %v", lis.Addr())
    if err := s.Serve(lis); err != nil {
        log.Fatalf("failed to serve: %v", err)
    }
}
```

### Client Usage (Go)

```go
// client/main.go
conn, err := grpc.Dial("orders-service:50051",
    grpc.WithTransportCredentials(credentials.NewClientTLSFromCert(nil, "")),
    grpc.WithUnaryInterceptor(retryInterceptor),
)
if err != nil {
    log.Fatalf("failed to connect: %v", err)
}
defer conn.Close()

client := pb.NewOrderServiceClient(conn)

// Unary call
order, err := client.GetOrder(ctx, &pb.GetOrderRequest{
    Name: "orders/ord_1234",
})

// Server-streaming
stream, err := client.WatchOrder(ctx, &pb.WatchOrderRequest{Name: "orders/ord_1234"})
for {
    update, err := stream.Recv()
    if err == io.EOF {
        break
    }
    if err != nil {
        log.Printf("stream error: %v", err)
        break
    }
    processUpdate(update)
}
```

### gRPC-Web for Browsers

gRPC requires HTTP/2 with trailers, which browsers cannot access directly from JavaScript. gRPC-Web is a protocol variant that works over HTTP/1.1 or with HTTP/2 without trailers, using an Envoy proxy or the gRPC-Web proxy to translate between browser HTTP and gRPC.

```
Browser (gRPC-Web) → Envoy Proxy → gRPC Service
```

The trade-off: client-streaming and bidirectional streaming are not supported in gRPC-Web. Only unary and server-streaming work through the proxy. For most browser use cases this is acceptable — full bidirectional streaming in a browser is unusual.

## When to Use / When NOT to Use

**Use gRPC when:**

- Service-to-service communication in a microservices architecture. The performance advantage is real: benchmarks consistently show gRPC using 5-10x less CPU and 3-5x less bandwidth than JSON/REST for equivalent workloads.
- Strong schema enforcement is required. Proto files are a contract that the compiler enforces. Type mismatches fail at compile time, not runtime.
- Streaming is a first-class requirement. Bidirectional streaming over a single connection is gRPC's killer feature for real-time data.
- Polyglot environments. Proto generates consistent, idiomatic client code in 10+ languages from a single schema.
- Low-latency is critical. Binary serialization and HTTP/2 multiplexing reduce per-request latency significantly.

**Do NOT use gRPC when:**

- Browser clients are your primary target. gRPC-Web adds proxy complexity and loses streaming features. REST or GraphQL is more ergonomic for browser-heavy applications.
- You need simple curl-based debugging and exploration. JSON REST APIs are trivially inspectable with any HTTP client. gRPC requires tooling like `grpcurl` or Postman's gRPC support.
- Third-party integrations are common. External developers integrating with your API expect REST. gRPC requires shared proto files and generated clients — a higher barrier to entry.
- Your team is not familiar with Protobuf or gRPC toolchain. The build system integration (buf, protoc, generated code management) adds maintenance overhead that eliminates the performance gain for small teams.
- The API is cache-heavy. HTTP caching via CDN or intermediary proxies does not work transparently with gRPC. REST GET requests cache naturally; gRPC POST requests do not.

## Common Mistakes

**Mistake 1: Returning raw errors instead of gRPC status codes**

```go
// Wrong
return nil, err  // returns codes.Unknown with the error message

// Right
return nil, status.Errorf(codes.NotFound, "order %q not found", name)
```

gRPC has 16 status codes that map to HTTP status codes. Always use them. Clients use status codes to decide retry behavior.

**Mistake 2: Not using proto field numbers correctly**

In Protobuf, field numbers are wire identifiers. Once you publish a field, its number is permanent. Changing field numbers breaks all existing clients.

```protobuf
// Adding a new field: always use a new number
message Order {
  string name = 1;
  string user_id = 2;
  // NEVER reuse field number 3 if you deleted a field with number 3
  // NEVER change the type of field 2
  string customer_note = 4;  // New field uses next available number
}
```

**Mistake 3: Missing proto3 default value handling**

Proto3 defaults all fields to zero values (`0`, `""`, `false`, `null`). You cannot distinguish between "field not set" and "field set to zero value" without using `google.protobuf.FieldMask` or wrapper types (`google.protobuf.StringValue`).

**Mistake 4: Not handling client disconnection in streaming RPCs**

```go
// Wrong: ignores client cancellation
for item := range largeDataset {
    stream.Send(item)  // Will block and eventually fail when client is gone
}

// Right: check context on every iteration
for item := range largeDataset {
    select {
    case <-stream.Context().Done():
        return nil  // Client disconnected gracefully
    default:
    }
    if err := stream.Send(item); err != nil {
        return err
    }
}
```

**Mistake 5: Using protobuf for public APIs without REST transcoding**

Internal services can be gRPC-only. Public APIs should offer REST as a fallback. Use gRPC-HTTP transcoding annotations so your proto serves both audiences from one definition.

## Connections

**Service Mesh** (Article 08): gRPC integrates deeply with service meshes. Istio and Linkerd both have first-class gRPC support, including circuit breaking at the RPC level, gRPC-specific retry policies, and load balancing that understands gRPC connection pooling.

**API Gateway** (Article 07): Modern API gateways (Kong, Envoy) support gRPC as a backend protocol and can transcode between REST and gRPC at the edge, giving you the best of both worlds: gRPC internally for performance, REST externally for developer experience.

**Consumer-Driven Contracts** (Article 06): Proto files are the strongest form of contract. Tools like `protolock` enforce backward compatibility rules. If you delete a field or change a field number, the CI build fails.

**Async API Patterns** (Article 09): gRPC bidirectional streaming is an alternative to WebSockets for real-time scenarios. The difference: gRPC requires the schema defined upfront, has better tooling, and provides structured error handling. WebSockets are more flexible but less structured.

## Key Insights

gRPC's most underappreciated feature is not performance — it is schema-first design. The proto file is a living contract between services. Every service team writes their proto file first, reviews it, and gets it approved before writing a single line of implementation. This forces API design to happen at the right moment: before implementation constraints make good design difficult.

The performance numbers are real but often overstated in their practical impact. The 10x bandwidth reduction matters enormously when you are sending millions of requests per second across data center interconnects. It matters much less when you are making 100 requests per day to an internal analytics service. Profile before optimizing.

The tooling ecosystem is maturing rapidly. `buf` (Buf Build) has made proto file linting, breaking change detection, and code generation vastly simpler than the original `protoc` workflow. If you are starting a new gRPC project, use `buf` instead of raw `protoc`. The buf.yaml and buf.gen.yaml configuration files replace hundreds of lines of Makefile protoc invocations.

The mental shift required for gRPC adoption is from "endpoint design" to "schema design." Teams that think of their API as a set of URLs to configure tend to struggle with gRPC. Teams that think of their API as a typed interface contract — like a programming language module — adapt quickly and find that gRPC's constraints produce better APIs than the unconstrained flexibility of JSON REST.
