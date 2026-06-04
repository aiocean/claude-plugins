# Asynchronous API Patterns

> "Synchronous APIs are a conversation. Asynchronous APIs are a postal service. Know which one your use case demands." — Unknown

## The Problem

Request-response is the default mental model for APIs: client sends a request, server processes it, client waits, server responds. For operations that complete in milliseconds, this works perfectly. For operations that take seconds, minutes, or hours — video transcoding, machine learning inference, large report generation, third-party payment authorization — the synchronous model breaks down.

A client waiting 30 seconds for a synchronous response is a poor user experience. A client waiting 10 minutes is unacceptable. Beyond latency, synchronous long-running operations create reliability problems: if the connection drops mid-operation, the client has no way to check whether the operation completed. Timeouts must be set long enough to accommodate the operation — but long timeouts mean slow failure detection. Load balancers default to 60-second timeouts; operations taking 5 minutes require custom configuration throughout the entire infrastructure stack.

The inverse problem is event-driven: servers that generate events (a payment completed, an order shipped, a file was uploaded) need to notify interested clients. Clients cannot wait on a synchronous call for "is there anything new?" — that is polling, which either wastes resources (polling frequently) or is slow to respond (polling infrequently). The server needs a mechanism to push notifications to clients when events occur.

Asynchronous API patterns solve both problems: long-running operations and event-driven notifications. The pattern space is wide — webhooks, SSE, WebSockets, long polling, callback URLs, async request-reply — and choosing the right pattern for each use case requires understanding their trade-offs in depth.

## Core Concept

The fundamental distinction is who initiates communication:

- **Client-initiated (pull)**: The client asks the server for information. Long polling, cursor-based polling, SSE initiated by client.
- **Server-initiated (push)**: The server sends information to the client when an event occurs. Webhooks, WebSocket server messages, SSE events.
- **Bidirectional**: Both sides send messages independently. WebSockets, gRPC bidirectional streaming.

### Pattern 1: Polling

The simplest async pattern. The client periodically calls a status endpoint until the operation completes.

```
POST /reports/generate → 202 Accepted { "reportId": "rpt_123" }
GET  /reports/rpt_123  → 200 { "status": "PROCESSING", "progress": 0.35 }
GET  /reports/rpt_123  → 200 { "status": "PROCESSING", "progress": 0.72 }
GET  /reports/rpt_123  → 200 { "status": "COMPLETE", "downloadUrl": "..." }
```

Simple to implement, but generates unnecessary load (requests when nothing has changed). Appropriate for operations with unpredictable duration and low event frequency. The `Retry-After` header guides polling interval:

```
HTTP/1.1 202 Accepted
Location: /reports/rpt_123
Retry-After: 5
Content-Type: application/json

{
  "status": "PROCESSING",
  "estimatedCompletionTime": "2024-01-15T10:35:00Z"
}
```

### Pattern 2: Long Polling

The client sends a request that the server holds open until an event occurs or a timeout expires. When the server responds (with an event or a timeout), the client immediately sends another request.

```
Client: GET /notifications?since=cursor_abc&timeout=30
Server: [holds connection for up to 30 seconds]
Server: [when event occurs or timeout]: 200 { events: [...], nextCursor: "cursor_def" }
Client: GET /notifications?since=cursor_def&timeout=30
```

Better than polling for event-driven use cases — responses arrive within seconds of the event, not at the next polling interval. The downside: one HTTP connection per polling client. At 10,000 concurrent clients, 10,000 connections are held open. This is manageable with non-blocking I/O (Node.js, Go, Kotlin coroutines) but problematic with blocking I/O (thread-per-connection Java).

Long polling was the dominant real-time pattern before WebSockets were widely supported. It is still appropriate for environments where WebSockets are blocked by firewalls or proxies (surprisingly common in enterprise networks).

### Pattern 3: Server-Sent Events (SSE)

SSE is a browser-native standard (EventSource API) for server-to-client event streaming over HTTP/1.1. The server opens a long-lived HTTP response and sends `text/event-stream` format messages:

```
GET /events HTTP/1.1
Accept: text/event-stream

---

HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
X-Accel-Buffering: no

event: order-update
data: {"orderId": "ord_123", "status": "SHIPPED"}
id: evt_001

event: price-change
data: {"productId": "prod_456", "newPrice": "29.99"}
id: evt_002

: heartbeat (comment, keeps connection alive)
```

SSE advantages over WebSockets for server-to-client scenarios:
- Native browser support (EventSource API, no library needed)
- Automatic reconnection with last event ID (the browser reconnects and sends `Last-Event-ID`, so the server can resume from where it left off)
- Works over HTTP/1.1 and HTTP/2 (WebSockets require the `Upgrade` header, blocked by some proxies)
- Simpler server implementation (one-directional)

SSE limitations:
- One-directional: server to client only. The client sends separate HTTP requests for client-to-server communication.
- HTTP/1.1 browser limit of 6 connections per domain — if you have 6 SSE streams open on a page, you block all other HTTP requests. HTTP/2 eliminates this (multiplexing), but requires HTTP/2.

SSE is the right choice for notification feeds, live dashboards, real-time log streaming, and any use case where the server pushes updates without needing to receive client messages over the same connection.

### Pattern 4: WebSockets

WebSockets provide full-duplex communication over a persistent connection. Both client and server can send messages at any time after the initial HTTP handshake (`Upgrade: websocket`).

```
Client: GET /ws HTTP/1.1
        Upgrade: websocket
        Connection: Upgrade
        Sec-WebSocket-Key: <base64-encoded-random-key>

Server: HTTP/1.1 101 Switching Protocols
        Upgrade: websocket
        Connection: Upgrade
        Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=

[Both sides can now send frames at any time]
```

WebSockets are appropriate when:
- The client sends messages to the server frequently (chat, collaborative editing, gaming)
- Low-latency bidirectional communication is required (sub-100ms round trips)
- Connection state is maintained across multiple message exchanges

WebSockets add complexity:
- Stateful connections require sticky sessions or distributed session state
- Load balancing requires connection affinity
- Reconnection logic must be implemented in the client
- Firewall and proxy support is inconsistent (HTTP `CONNECT` tunneling required in some environments)

### Pattern 5: Webhooks

Webhooks invert the HTTP call: instead of a client calling a server, the server calls the client. When an event occurs, the server makes an HTTP POST to a URL that the client registered:

```
# 1. Client registers a webhook
POST /webhooks
{
  "url": "https://client.example.com/stripe-events",
  "events": ["charge.succeeded", "charge.failed"],
  "secret": "whsec_abc123"
}

# 2. When a charge succeeds, Stripe calls the client's endpoint
POST https://client.example.com/stripe-events
Stripe-Signature: t=1704067260,v1=abc123...
Content-Type: application/json

{
  "type": "charge.succeeded",
  "data": {
    "object": {
      "id": "ch_3NpLfG...",
      "amount": 2000,
      "currency": "usd"
    }
  }
}
```

Webhooks are the standard for event-driven integrations with third-party systems: Stripe uses webhooks for payment events, GitHub for repository events, Twilio for SMS delivery, Shopify for order events. The pattern is so common that "webhook" has become the de facto name for HTTP callbacks.

### Pattern 6: Async Request-Reply (202 + Polling or Webhook)

For long-running operations, the canonical pattern is:
1. Accept the request (202 Accepted) with a job resource
2. Client polls the job resource, or provides a callback URL for completion notification

```
# Request with callback URL
POST /video/transcode
{
  "inputUrl": "s3://bucket/video.mp4",
  "format": "hls",
  "callbackUrl": "https://client.example.com/transcode-done"
}

→ 202 Accepted
{
  "jobId": "job_abc123",
  "status": "QUEUED",
  "statusUrl": "https://api.example.com/jobs/job_abc123"
}

# When complete, server calls the callback URL
POST https://client.example.com/transcode-done
{
  "jobId": "job_abc123",
  "status": "COMPLETE",
  "outputUrl": "s3://bucket/video/hls/master.m3u8"
}
```

This pattern decouples the operation duration from the HTTP request duration. The client's HTTP connection drops after 202; the operation continues in the background. The callback URL or polling handles completion notification.

## Deep Dive

The distinction between synchronous and asynchronous APIs is not primarily a technical choice — it is a modeling choice about the nature of the operation being performed. Roy Fielding's REST constraints are silent on asynchrony because the request-response model is fundamental to HTTP. But the operations that APIs expose vary in their temporal character: some operations are inherently instantaneous (read a resource, validate an input), some are inherently deferred (process a video, run a report, fulfill an order). The mistake that leads to poor async API design is treating the temporal character of an operation as an implementation detail rather than a first-class property of the API contract. When an operation is inherently long-running, the API should express this through its design — using the 202 Accepted pattern, returning an operation resource, and providing a consistent way to check completion — rather than pretending it is synchronous by holding the connection open or returning a partial response.

The webhook pattern — where the server calls the client when an event occurs — reverses the conventional client-server relationship and creates a set of design challenges that are genuinely different from synchronous API design. The most fundamental challenge is security: when a server receives a webhook delivery, it cannot inherently verify that the delivery came from the expected source rather than a malicious actor who guessed the endpoint URL. The HMAC signature pattern that Stripe pioneered (and that GitHub, Slack, and most major webhook-publishing platforms have adopted) solves this by including a cryptographic signature of the request body in a header. The signature is computed using a shared secret known only to the webhook publisher and the registered endpoint. A client that verifies the signature before processing the webhook body has a strong guarantee that the request came from the expected publisher. Clients that skip signature verification are vulnerable to replay attacks (forwarding valid webhook deliveries to trigger actions) and forgery attacks (sending fabricated webhook payloads to an endpoint).

The at-least-once delivery guarantee that all production webhook systems provide — Stripe's documentation explicitly states this, as do GitHub's and Slack's — has a critical implication for webhook consumer design: idempotency is required, not optional. The same webhook event will be delivered more than once in normal operation: when the first delivery times out, the publisher retries. When the consumer's endpoint returns a 500 error during processing, the publisher retries. When a network partition delays the acknowledgment, the publisher may retry before the first delivery is confirmed lost. Webhook consumers that are not idempotent will process the same payment twice, send the same notification twice, or create duplicate records. The correct design pattern is to use the event's unique ID (Stripe provides `id`, GitHub provides `X-GitHub-Delivery`, Slack provides `event_id`) as an idempotency key: record each processed event ID before processing, and skip events whose IDs have already been processed.

Server-Sent Events (SSE) and WebSockets occupy different points in the async communication space that are worth distinguishing carefully. SSE is HTTP/1.1-compatible, text-based, and unidirectional: the server pushes events to the client over a persistent HTTP connection; the client cannot send messages back on the same connection. SSE is simpler to implement, works through HTTP proxies without special configuration, and supports automatic reconnection natively in the browser's EventSource API. WebSockets establish a separate protocol (from HTTP to WS) with bidirectional framing: either side can send messages at any time. WebSockets are appropriate when the communication is genuinely bidirectional at high frequency (collaborative editing, multiplayer games, live chat). SSE is appropriate when the server needs to push updates to many clients but the clients do not need to send high-frequency messages back (live dashboards, notification streams, progress updates). Choosing WebSockets for server-push use cases is a common over-engineering that adds complexity without benefit.

The Google API Design Guide's treatment of long-running operations (AIP-151) provides the most carefully specified pattern for async request-reply. The pattern uses a consistent `Operation` resource type across all Google APIs: a long-running request returns an `Operation` object with a name (e.g., `operations/1234`), a `done` field, and either a `response` (when complete) or an `error`. Clients poll the operation resource until `done` is true. The polling interval is communicated via the `Retry-After` header or a client-side backoff policy. The operation resource can be listed and deleted, giving clients full lifecycle control over in-progress operations. This standardization means that any Google Cloud client library has a single `waitForOperation()` abstraction that works for any long-running operation across any Google API — Cloud Storage bucket creation, BigQuery job completion, Cloud Dataflow pipeline launch — without any API-specific polling code.

## Implementation Guide

### Designing Webhook Contracts

```typescript
// Webhook event envelope — consistent across all event types
interface WebhookEvent<T> {
  id: string;              // Unique event ID for deduplication
  type: string;            // Event type: "order.created", "payment.succeeded"
  apiVersion: string;      // API version that generated this event
  createdAt: string;       // ISO 8601 timestamp
  data: {
    object: T;             // The resource that triggered the event
    previousAttributes?: Partial<T>;  // For update events: what changed
  };
  livemode: boolean;       // Distinguishes test from production events
}

// Example: order created event
interface OrderCreatedEvent extends WebhookEvent<Order> {
  type: 'order.created';
}
```

**Versioning webhook payloads**: Use the same versioning discipline as your API. If you add a field, it is non-breaking. If you remove or rename a field, it is breaking. Include an `apiVersion` field in every webhook payload so consumers know which schema to parse.

### Implementing Delivery Guarantees

```go
// Webhook delivery with retry
type WebhookDelivery struct {
    EventID     string
    EndpointURL string
    Payload     []byte
    Signature   string
    AttemptNum  int
    MaxAttempts int
    NextRetry   time.Time
}

func (w *WebhookWorker) deliver(ctx context.Context, d WebhookDelivery) error {
    req, _ := http.NewRequestWithContext(ctx, "POST", d.EndpointURL, bytes.NewReader(d.Payload))
    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("X-Webhook-Signature", d.Signature)
    req.Header.Set("X-Webhook-ID", d.EventID)
    req.Header.Set("X-Webhook-Attempt", strconv.Itoa(d.AttemptNum))
    
    // Short timeout — webhook endpoints should be fast
    client := &http.Client{Timeout: 30 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        return w.scheduleRetry(ctx, d, err)
    }
    defer resp.Body.Close()
    
    if resp.StatusCode >= 200 && resp.StatusCode < 300 {
        return w.markDelivered(ctx, d.EventID)
    }
    
    if resp.StatusCode >= 400 && resp.StatusCode < 500 {
        // Client error — do not retry (misconfigured endpoint)
        return w.markFailed(ctx, d.EventID, "client error: "+resp.Status)
    }
    
    // 5xx or unexpected status — retry
    return w.scheduleRetry(ctx, d, fmt.Errorf("server error: %s", resp.Status))
}

func (w *WebhookWorker) scheduleRetry(ctx context.Context, d WebhookDelivery, reason error) error {
    if d.AttemptNum >= d.MaxAttempts {
        return w.markFailed(ctx, d.EventID, "max attempts exceeded: "+reason.Error())
    }
    
    // Exponential backoff: 1m, 5m, 30m, 1h, 2h, 4h, 8h
    delays := []time.Duration{
        time.Minute, 5*time.Minute, 30*time.Minute,
        time.Hour, 2*time.Hour, 4*time.Hour, 8*time.Hour,
    }
    delay := delays[min(d.AttemptNum, len(delays)-1)]
    
    return w.enqueue(ctx, WebhookDelivery{
        EventID:     d.EventID,
        EndpointURL: d.EndpointURL,
        Payload:     d.Payload,
        Signature:   d.Signature,
        AttemptNum:  d.AttemptNum + 1,
        MaxAttempts: d.MaxAttempts,
        NextRetry:   time.Now().Add(delay),
    })
}
```

### Server-Sent Events Implementation

```go
// Go SSE handler
func (h *Handler) StreamEvents(w http.ResponseWriter, r *http.Request) {
    // SSE requires flushing — verify the writer supports it
    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "Streaming not supported", http.StatusInternalServerError)
        return
    }
    
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    w.Header().Set("X-Accel-Buffering", "no") // Disable nginx buffering
    
    // Get user's last seen event ID for resumption
    lastEventID := r.Header.Get("Last-Event-ID")
    
    events := h.eventBus.Subscribe(r.Context(), r.URL.Query().Get("userId"), lastEventID)
    defer h.eventBus.Unsubscribe(events)
    
    // Heartbeat ticker — keeps connection alive through proxies
    heartbeat := time.NewTicker(30 * time.Second)
    defer heartbeat.Stop()
    
    for {
        select {
        case event, ok := <-events:
            if !ok {
                return
            }
            // Write SSE format
            fmt.Fprintf(w, "id: %s\n", event.ID)
            fmt.Fprintf(w, "event: %s\n", event.Type)
            fmt.Fprintf(w, "data: %s\n\n", event.Data)
            flusher.Flush()
            
        case <-heartbeat.C:
            // SSE comment as heartbeat
            fmt.Fprintf(w, ": heartbeat\n\n")
            flusher.Flush()
            
        case <-r.Context().Done():
            return
        }
    }
}
```

## When to Use / When NOT to Use

| Pattern | Use When | Avoid When |
|---|---|---|
| Polling | Simple, infrequent checks; short operations | High frequency needed; many concurrent clients |
| Long Polling | Push-like behavior without WebSocket; enterprise networks | Many concurrent clients with blocking I/O |
| SSE | Server→client notifications; dashboards; feeds | Client needs to send messages; non-browser clients |
| WebSocket | Real-time bidirectional; chat; collaboration | Stateless servers; high connection counts; CDN caching needed |
| Webhook | Server→external client; integrations; event notifications | Clients behind NAT/firewall; mobile clients |
| Async Request-Reply | Long-running operations; queue-based processing | Sub-second operations (use sync instead) |

## Common Mistakes

**Mistake 1: Not making webhook consumers idempotent**

Webhooks are delivered at-least-once. The same event arrives twice. If your consumer creates an order on `order.created`, it will create two orders. Use the event ID for deduplication:

```python
def handle_order_created(event):
    if db.event_already_processed(event['id']):
        return  # Already handled — this is a duplicate delivery
    
    db.create_order(event['data']['object'])
    db.mark_event_processed(event['id'])
```

**Mistake 2: Processing webhooks synchronously in the HTTP handler**

Webhook endpoints must return 2xx within 30 seconds (Stripe's timeout) or 5 seconds (GitHub's expectation). If processing takes longer, the delivery times out and gets retried. Accept the webhook immediately, enqueue the payload for async processing, and return 200:

```python
@app.route('/webhook', methods=['POST'])
def webhook():
    verify_signature(request)          # Verify first (fast)
    queue.enqueue(request.get_json())  # Enqueue for async processing
    return '', 200                     # Return immediately
```

**Mistake 3: Not versioning SSE event schemas**

SSE event schemas evolve. If you change the structure of a `price-change` event, all connected clients stop working. Include a version field in every event, and handle schema evolution gracefully in clients.

**Mistake 4: Webhook URL stored without validation**

Validate webhook URLs before storing: reject private IP addresses (SSRF prevention), require HTTPS in production, and validate the URL is reachable. The challenge-response verification pattern (as used by Slack) is the gold standard.

**Mistake 5: Not providing a webhook event log**

When a webhook consumer misses events (endpoint was down, signature verification bug), there is no way to replay missed events without an event log. Provide a queryable history of recent webhook deliveries, as Stripe does, so consumers can replay missed events manually.

## Connections

**API Idempotency** (Article 05): Webhook delivery and async callbacks are at-least-once. Consumer idempotency is not optional — it is required for correctness. Every webhook handler must implement deduplication.

**API Gateway** (Article 07): Gateways can route SSE and WebSocket connections to dedicated backend servers optimized for long-lived connections. AWS API Gateway supports WebSocket APIs natively. Cloudflare Workers support SSE and WebSocket at the edge.

**API Design Principles** (Article 10): AsyncAPI is the OpenAPI equivalent for event-driven APIs. Documenting webhook event schemas in AsyncAPI format provides the same discoverability benefits as OpenAPI for REST APIs.

## Key Insights

The choice between webhooks and polling is not just technical — it is architectural. Polling is client-driven (the client decides when to check). Webhooks are server-driven (the server decides when to notify). In integrations where the client and server are different organizations, webhooks put more operational burden on the client (who must run a publicly accessible HTTP endpoint) but enable real-time notifications that polling cannot match.

SSE is underused. Most developers reach for WebSockets when they need server-to-client push, not realizing that SSE handles the majority of real-time use cases with less complexity. SSE has automatic reconnection built into the browser, respects HTTP/2 multiplexing, works with standard HTTP infrastructure (CDNs, load balancers), and is half the operational complexity of WebSockets. If your use case is server-to-client only — notifications, live updates, activity feeds — SSE is almost always the better choice.

The async request-reply pattern with callback URLs is the right model for long-running operations, but it requires that the client provide a publicly reachable callback URL. This works for server-to-server integrations but not for browser clients. For browser clients, combine the 202 pattern with SSE or WebSocket for completion notification: the browser subscribes to an SSE stream for its session, and the server sends a completion event when the long-running operation finishes. This avoids polling while maintaining the async model.
