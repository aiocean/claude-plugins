# Service Discovery Patterns

> "In a distributed system, the hardest part is not making services talk to each other. It's making them find each other first." — common practitioner wisdom

## The Problem

In a monolithic application, a function calls another function by name. The compiler resolves the name to an address at build time. The address never changes. There is no "service discovery" — you just call the function.

In a distributed system, a service calls another service over the network. But what network address? In modern infrastructure, services are deployed as containers orchestrated by Kubernetes or similar platforms. A container running your payment service today might be at IP 10.0.1.45. After a pod restart tomorrow it might be at 10.0.2.12. After a deployment rolling update, three old pods at three addresses are replaced by three new pods at three different addresses, one at a time. After an autoscaling event, there might be ten payment service pods instead of three.

If you hardcode IP addresses, your services break every time the infrastructure changes. You need a layer of indirection: a mechanism that always knows the current healthy addresses for a service, and that clients can query to find where to send requests.

This is service discovery. It sounds simple. In practice, it involves trade-offs between consistency (every client sees the same up-to-date view), availability (clients can always find a healthy service instance), and freshness (stale registrations cause requests to dead instances). These trade-offs play out differently depending on whether you use client-side discovery, server-side discovery, DNS, or a dedicated service registry.

## Core Concept

### Client-Side Discovery

In client-side discovery, the client queries the service registry directly, receives a list of healthy service instances, and chooses which one to call. The client is responsible for load balancing.

```
Client-Side Discovery:

┌──────────┐  1. query "payment-service"   ┌──────────────────┐
│  Order   │ ──────────────────────────►  │ Service Registry │
│ Service  │ ◄──────────────────────────  │  (Eureka/Consul) │
│ (client) │  2. returns [10.0.1.5:8080,  └──────────────────┘
└──────────┘         10.0.1.6:8080]              ▲ ▲
     │                                           │ │
     │  3. client load-balances                  │ │
     │     and calls directly                    │ │
     ▼                                    register│ │heartbeat
┌──────────┐   ┌──────────┐              ┌───────┘ └───────┐
│ Payment  │   │ Payment  │              │Payment  Payment │
│  Svc 1   │   │  Svc 2   │              │  Svc 1  Svc 2   │
│10.0.1.5  │   │10.0.1.6  │              └─────────────────┘
└──────────┘   └──────────┘
```

**Advantages**: Simple registry (just a store), client can implement sophisticated load balancing (weighted, latency-aware, circuit-breaking), no extra hop.

**Disadvantages**: Every client must implement service discovery and load balancing logic. In a polyglot environment (Java, Go, Python services), this logic must be duplicated in every language. Updates to load balancing strategy require updating every client.

Netflix Eureka (used with Ribbon load balancer) is the canonical client-side discovery implementation. Spring Cloud Netflix popularized this pattern in the Java ecosystem.

### Server-Side Discovery

In server-side discovery, the client sends requests to a load balancer or API gateway. The load balancer queries the service registry and forwards the request to a healthy instance. The client knows nothing about service instances.

```
Server-Side Discovery:

┌──────────┐  1. POST /payments        ┌───────────────┐
│  Order   │ ────────────────────────► │ Load Balancer │
│ Service  │ ◄──────────────────────── │   / Ingress   │
│ (client) │  4. response              └───────┬───────┘
└──────────┘                                   │
                                    2. query   │  3. forward to
                                    registry   │  healthy instance
                                               ▼
                          ┌────────────────────────────────────┐
                          │         Service Registry           │
                          │  payment-service:                  │
                          │    10.0.1.5:8080 (healthy)         │
                          │    10.0.1.6:8080 (healthy)         │
                          │    10.0.1.7:8080 (draining)        │
                          └────────────────────────────────────┘
```

**Advantages**: Clients are simple — they call a stable address (the load balancer). Load balancing logic is centralized. Language-agnostic.

**Disadvantages**: Load balancer is a potential bottleneck and single point of failure (though this is mitigated with HA load balancers). Extra network hop adds latency. Load balancer must be highly available.

AWS Elastic Load Balancer, Kubernetes Service (with kube-proxy), and NGINX are server-side discovery implementations. Most modern cloud-native architectures use server-side discovery via Kubernetes Services.

### DNS-Based Discovery

DNS provides a distributed, cached, hierarchically managed naming system. Service discovery via DNS maps service names to IP addresses using standard DNS records.

```
DNS-based discovery:

payment-service.production.svc.cluster.local
    → A records: 10.0.1.5, 10.0.1.6  (round-robin)
    
payment-service.production.svc.cluster.local
    → SRV records: 
        10.0.1.5:8080 (weight 10)
        10.0.1.6:8080 (weight 10)
```

Kubernetes uses DNS as its primary service discovery mechanism. When you create a Kubernetes Service named `payment-service` in namespace `production`, it becomes accessible at `payment-service.production.svc.cluster.local`. kube-dns (or CoreDNS) automatically updates DNS records as pods are added or removed.

**Advantages**: Universal — every language has DNS resolution built in. No special client library needed. Caching is built into DNS (TTL-based). Works across different environments (dev, staging, prod) by changing the DNS server.

**Disadvantages**: DNS is eventually consistent — TTL caching means clients may use stale addresses for TTL seconds after a change. DNS round-robin provides only simple load balancing (no health-aware routing, no weighted routing without SRV records). DNS clients often cache aggressively, ignoring TTL values.

**The TTL trap**: Setting a low TTL (e.g., 5 seconds) reduces staleness but dramatically increases DNS query load. Setting a high TTL (e.g., 300 seconds) reduces query load but means failed pods continue receiving traffic for up to 300 seconds. Production Kubernetes typically uses TTL=10-30 seconds as a compromise.

### Service Registry: Consul, etcd, ZooKeeper

A dedicated service registry is a strongly-consistent, highly-available key-value store with service-specific features (health checking, leader election, watches/subscriptions).

```
Service Registry Architecture (Consul):

┌─────────────────────────────────────────────┐
│              Consul Cluster                  │
│   ┌────────┐  ┌────────┐  ┌────────┐        │
│   │ Leader │  │Follow. │  │Follow. │ Raft    │
│   └────────┘  └────────┘  └────────┘ consensus│
└─────────────────────────────────────────────┘
          ▲              ▲
          │ register     │ register
          │ + heartbeat  │ + heartbeat
    ┌─────┴──────┐  ┌────┴───────┐
    │  Payment   │  │  Payment   │
    │  Svc A     │  │  Svc B     │
    └────────────┘  └────────────┘
    
Health checking:
  Consul actively probes registered services via:
  - HTTP check: GET /health → expect 200
  - TCP check: can connect to port
  - Script check: run arbitrary script
  - TTL check: service must send heartbeat every N seconds
  
  Failed health checks → service removed from "healthy" view
  Clients only receive healthy instances
```

**Consul** uses Raft consensus for strong consistency, gossip (SWIM protocol) for membership, and provides both a DNS interface and an HTTP API. It is the most feature-rich general-purpose service registry.

**etcd** is a distributed key-value store used primarily by Kubernetes as its backing store. It provides watches (subscribe to changes) which makes it suitable for service discovery: clients watch for changes to service keys and update their routing tables immediately.

**ZooKeeper** is the original consensus-based coordination service. Used by older distributed systems (Kafka, HDFS). It provides strong consistency but has a complex operational profile (Java-based, JVM tuning required).

### Health Checking Strategies

Service discovery is only as good as its health checking. A registry that includes unhealthy instances causes clients to send requests into a void.

```
Health check types and trade-offs:

1. Active health checks (registry probes service):
   + Registry has authoritative view of service health
   + Works even if service stops sending heartbeats
   - Extra load on services from health check requests
   - Health check endpoint may not reflect actual service health
   
   Example (Consul):
   service {
     name = "payment-service"
     address = "10.0.1.5"
     port = 8080
     check {
       http = "http://10.0.1.5:8080/health"
       interval = "10s"
       timeout = "2s"
       deregister_critical_service_after = "30s"
     }
   }

2. Passive health checks (client observes failures):
   + No extra load on services
   + Based on real traffic (not synthetic probes)
   - Requires client-side logic to detect failures
   - First request to a bad instance always fails
   
   Example (Envoy outlier detection):
   outlier_detection:
     consecutive_5xx: 3        # after 3 consecutive 5xx
     ejection_percent: 50      # eject up to 50% of instances
     base_ejection_time: 30s   # eject for 30 seconds

3. Combined (active + passive):
   Best practice in production
   Active checks catch failed-but-not-yet-detected instances
   Passive checks provide real-time feedback on request quality
```

## Deep Dive

### Service Discovery as a CAP Trade-off

Service discovery is a consistency versus availability problem with a twist: the wrong choice is not data corruption, it is failed requests. A registry that prioritizes consistency (CP behavior) stops serving during a network partition — no client can discover services until quorum is restored. A registry that prioritizes availability (AP behavior) continues serving during a partition, but clients on each side may see different, potentially stale service views.

Netflix's Eureka deliberately chose AP. The team's reasoning, documented in their 2012 engineering blog, was that a brief period of stale service addresses (where a client might try to reach a dead instance before detecting failure) is far less harmful than a registry outage. A streaming platform cannot afford a scenario where a Eureka quorum loss prevents clients from discovering any services at all. The cost — client-side retry logic and circuit breakers to handle stale addresses — is paid at the application layer.

Consul made the opposite choice for its key-value store: Raft consensus, CP behavior. But Consul's health-checking gossip layer (SWIM protocol) is AP. This is a deliberate split: the registry's view of *which services exist* uses eventually consistent gossip (fast, always available), while the registry's view of *configuration data* uses Raft (consistent, may be unavailable during partition). Understanding which parts of a service registry are CP and which are AP is essential for reasoning about failure modes.

### The Fallacy of Zero Topology Change

Service discovery exists because of Fallacy 5 of distributed computing: topology doesn't change. In modern container orchestration, topology changes constantly. Kubernetes schedules pods on nodes based on resource availability, not on stable IP assignments. A rolling deployment replaces instances one at a time, so during the rollout, multiple versions coexist with different IP addresses. Autoscaling adds and removes instances based on load. Health checks remove instances that fail and re-add them when they recover.

The design challenge for service discovery is not just "how do clients find services?" but "how quickly do clients stop sending traffic to dead instances, and how quickly do they discover new instances?" These are two different latency requirements. Health-check polling intervals, DNS TTLs, and watch subscription latencies each contribute to the detection-and-propagation delay. In the *Designing Data-Intensive Applications* framing (Kleppmann, 2017), this is the "stale reads" problem applied to infrastructure metadata rather than application data: clients read from a cache (their local service endpoint list) that may lag the authoritative state.

### Raft as the Foundation for Consistent Registries

etcd (which backs Kubernetes) and Consul's key-value store use the Raft consensus algorithm (Ongaro and Ousterhout, 2014). Raft was explicitly designed to be more understandable than Paxos while providing the same guarantees. The core contribution of the Raft paper was decomposing consensus into three relatively independent sub-problems: leader election, log replication, and safety constraints. The paper includes a formal correctness proof and a user study showing that students understood Raft significantly better than Paxos after reading both papers.

For service registries, Raft provides a crucial property: every committed write is visible to all subsequent reads, regardless of which node the client connects to. This means that when a service deregisters (because it is shutting down), that deregistration is guaranteed to be seen by all clients after the Raft write commits — there is no race condition where a client reads a pre-deregistration snapshot from a stale follower. The cost is quorum writes: a 3-node Raft cluster requires 2 nodes to be available for writes to proceed, which is the availability trade-off that makes Eureka's AP design attractive for high-stakes reliability contexts.

## Implementation Guide

### Implementing Service Discovery with Consul

```go
package discovery

import (
    "fmt"
    consulapi "github.com/hashicorp/consul/api"
    "time"
)

type ConsulRegistry struct {
    client    *consulapi.Client
    serviceID string
}

func NewConsulRegistry(addr string) (*ConsulRegistry, error) {
    config := consulapi.DefaultConfig()
    config.Address = addr
    client, err := consulapi.NewClient(config)
    if err != nil {
        return nil, fmt.Errorf("consul client: %w", err)
    }
    return &ConsulRegistry{client: client}, nil
}

// Register registers this service instance with Consul.
func (r *ConsulRegistry) Register(name, address string, port int) error {
    r.serviceID = fmt.Sprintf("%s-%s-%d", name, address, port)
    
    registration := &consulapi.AgentServiceRegistration{
        ID:      r.serviceID,
        Name:    name,
        Address: address,
        Port:    port,
        Check: &consulapi.AgentServiceCheck{
            HTTP:                           fmt.Sprintf("http://%s:%d/health", address, port),
            Interval:                       "10s",
            Timeout:                        "2s",
            DeregisterCriticalServiceAfter: "30s",
        },
        Tags: []string{"v1", "production"},
    }
    
    return r.client.Agent().ServiceRegister(registration)
}

// Deregister removes this instance from Consul on shutdown.
func (r *ConsulRegistry) Deregister() error {
    return r.client.Agent().ServiceDeregister(r.serviceID)
}

// Discover returns healthy instances for the given service.
func (r *ConsulRegistry) Discover(serviceName string) ([]string, error) {
    services, _, err := r.client.Health().Service(
        serviceName,
        "",    // tag filter (empty = all tags)
        true,  // passingOnly = only healthy instances
        &consulapi.QueryOptions{},
    )
    if err != nil {
        return nil, fmt.Errorf("consul health query: %w", err)
    }
    
    addrs := make([]string, 0, len(services))
    for _, svc := range services {
        addrs = append(addrs, fmt.Sprintf("%s:%d", svc.Service.Address, svc.Service.Port))
    }
    return addrs, nil
}

// Watch watches for changes to a service and calls onChange.
func (r *ConsulRegistry) Watch(serviceName string, onChange func([]string)) {
    var lastIndex uint64
    
    for {
        services, meta, err := r.client.Health().Service(
            serviceName, "", true,
            &consulapi.QueryOptions{
                WaitIndex: lastIndex,  // Long polling: block until change
                WaitTime:  30 * time.Second,
            },
        )
        if err != nil {
            time.Sleep(5 * time.Second) // backoff on error
            continue
        }
        
        if meta.LastIndex != lastIndex {
            lastIndex = meta.LastIndex
            addrs := make([]string, 0, len(services))
            for _, svc := range services {
                addrs = append(addrs, fmt.Sprintf("%s:%d", svc.Service.Address, svc.Service.Port))
            }
            onChange(addrs)
        }
    }
}
```

### Client-Side Load Balancing with Discovery

```python
import random
import time
from collections import defaultdict

class DiscoveryAwareClient:
    """HTTP client with built-in service discovery and load balancing."""
    
    def __init__(self, registry, service_name: str):
        self.registry = registry
        self.service_name = service_name
        self.endpoints = []
        self.failure_counts = defaultdict(int)
        self.circuit_open_until = {}
        
        # Initialize and start watching for changes
        self._refresh_endpoints()
        registry.watch(service_name, self._on_endpoints_changed)
    
    def _refresh_endpoints(self):
        try:
            self.endpoints = self.registry.discover(self.service_name)
        except Exception:
            pass  # Keep using stale endpoints
    
    def _on_endpoints_changed(self, new_endpoints: list[str]):
        self.endpoints = new_endpoints
        # Clear failure counts for newly added endpoints
        current = set(new_endpoints)
        self.failure_counts = {
            k: v for k, v in self.failure_counts.items() if k in current
        }
    
    def _healthy_endpoints(self) -> list[str]:
        now = time.time()
        return [
            ep for ep in self.endpoints
            if self.circuit_open_until.get(ep, 0) <= now
        ]
    
    def get(self, path: str) -> dict:
        healthy = self._healthy_endpoints()
        if not healthy:
            raise NoHealthyEndpoints(f"No healthy endpoints for {self.service_name}")
        
        # Random load balancing (can be replaced with round-robin, least-conn, etc.)
        endpoint = random.choice(healthy)
        
        try:
            response = http_get(f"http://{endpoint}{path}", timeout=5)
            self.failure_counts[endpoint] = 0  # reset on success
            return response
        except Exception as e:
            self.failure_counts[endpoint] += 1
            if self.failure_counts[endpoint] >= 3:
                # Open circuit for 30 seconds
                self.circuit_open_until[endpoint] = time.time() + 30
            raise
```

## When to Use / When NOT to Use

**Use DNS-based discovery when:**
- Running in Kubernetes (it is the default and just works)
- You need a language-agnostic solution with zero client library requirements
- Your services do not change addresses frequently (low churn)
- Simple round-robin load balancing is sufficient

**Use a dedicated registry (Consul, etcd) when:**
- You need health-aware routing (only healthy instances receive traffic)
- You need watches/subscriptions (real-time notification when services change)
- You need rich metadata (datacenter, version tags, weights)
- You are building a service mesh or need mTLS certificate management

**Use client-side discovery when:**
- You need sophisticated client-side load balancing (least connections, latency-weighted)
- You want to implement client-side circuit breaking
- All clients are under your control and in the same language ecosystem

**Use server-side discovery when:**
- Clients are heterogeneous (many languages, external clients)
- You want to centralize load balancing and traffic policy
- You are building a multi-tenant platform where clients should not know about instance topology

## Common Mistakes

**Mistake 1: Not handling stale endpoints gracefully**
Service discovery is eventually consistent. A client's cached endpoint list may include dead instances. Always implement retry logic that moves to a different endpoint on failure, rather than retrying the same dead endpoint.

**Mistake 2: Setting TTL too high on DNS entries**
A DNS TTL of 300 seconds (5 minutes) means a failed pod may receive traffic for up to 5 minutes. Use TTL of 10-30 seconds for services that may fail and need quick failover.

**Mistake 3: Not implementing graceful deregistration**
When a service shuts down, it should deregister from the registry before stopping. Without graceful deregistration, the registry may continue advertising the address for up to `deregister_critical_service_after` seconds. Use shutdown hooks to deregister and drain in-flight requests.

**Mistake 4: Health check that always passes**
A health endpoint that always returns 200 regardless of service state provides no value. Health checks should verify actual service dependencies: can the service connect to its database? Is the message queue reachable? Return 503 if the service is not ready to serve traffic.

**Mistake 5: Single registry without HA**
A service registry that is a single point of failure defeats the purpose. Run Consul in a 3-node or 5-node cluster with Raft replication. Run etcd with 3 or 5 nodes. A single-node registry going down takes down all service-to-service communication.

## Connections

- **Consistent Hashing** (Article 02): In stateful services (databases, caches), service discovery must return the *specific* instance responsible for a given key. Client-side discovery combined with consistent hashing routes requests to the correct shard.
- **Gossip Protocols** (Article 06): Consul uses gossip (SWIM protocol) for cluster membership. The service registry knows about node failures via gossip-based failure detection, which drives health status in the registry.
- **Distributed Tracing** (Article 10): When a client discovers a service and makes a call, the distributed trace must propagate through that call. Service discovery changes (failover to a different instance mid-trace) complicate trace correlation.
- **Split Brain** (Article 12): A service registry that loses quorum during a network partition may either stop serving (CP behavior) or serve stale data (AP behavior). Understanding your registry's partition behavior is critical for designing robust service discovery.

## Key Insights

**Insight 1: Service discovery is a caching problem.** The registry is the authoritative source, but clients cache the registry's answer for performance. Every caching problem involves staleness. The TTL of the cache (whether DNS TTL, watch interval, or refresh period) determines the maximum staleness. Choose it based on how quickly you need to respond to service failures.

**Insight 2: Health checking is the heart of service discovery.** The registry is only useful if it accurately reflects which instances can serve traffic. Invest in good health checks: check real dependencies (database connectivity, downstream service health), tune intervals and timeouts to catch failures quickly without false positives.

**Insight 3: DNS is good enough for most use cases.** Kubernetes DNS with readiness probes provides health-aware service discovery with zero client library requirements. For most microservices architectures, this is the right starting point. Add Consul or a service mesh only when you need features DNS cannot provide: rich health metadata, mTLS, traffic shaping, cross-datacenter federation.

**Insight 4: Graceful degradation requires multiple layers.** When a service instance fails, you need: health checks to remove it from the registry (seconds to tens of seconds), client-side retry to move to a different instance, circuit breaking to stop sending to a failed instance even before the registry is updated. These layers work together — no single layer is sufficient.

**Insight 5: Service discovery is coupled to deployment strategy.** Blue-green deployments, canary releases, and rolling updates all require precise control over which instances are in the registry and receiving traffic. Service discovery infrastructure must support deployment workflows: pre-registering new instances before they receive production traffic, draining instances before shutdown, routing a percentage of traffic to canary instances.
