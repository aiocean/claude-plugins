# Health Endpoint Monitoring

> "A health endpoint that always returns 200 OK is not a health endpoint. It is a liveness theater." — Michael Nygard, Release It!

## The Problem

Infrastructure needs to know whether a service instance is ready to receive traffic. Load balancers need to stop routing to instances that are broken. Orchestrators like Kubernetes need to restart instances that are stuck. Deployment pipelines need to know whether a new version is serving requests correctly before expanding the rollout. All of these needs converge on a single question: is this instance healthy?

The naive solution — check if the process is running — is nearly useless. A process can be running and completely unable to serve requests. An application might start up, bind to a port, and then fail to connect to its database. The HTTP listener is active, so the process health check passes. But every request to that instance returns a 500 error because the database connection failed. The load balancer continues sending traffic to a broken instance.

The opposite problem is equally damaging: a health check that does too much. An overly deep health check verifies not just the instance's own health but the health of its dependencies. If the recommendation service is slow, the health check fails. The load balancer removes the instance. All instances have the same slow recommendation service, so all instances fail their health checks. The load balancer has no instances to route to. Total outage caused by a partial dependency degradation — the exact scenario the health check was meant to protect against.

The third problem is distinguishing between different types of "not healthy." An instance that is starting up and not yet ready to receive traffic is different from an instance that is running but broken. An instance that is temporarily overloaded is different from one with a crashed dependency. Load balancers, orchestrators, and deployment pipelines need to make different decisions for these different states.

## Core Concept

Health endpoint monitoring uses HTTP endpoints exposed by each service instance to provide machine-readable health status. Infrastructure components (load balancers, orchestrators, deployment pipelines) poll these endpoints to make automated routing and lifecycle decisions.

There are three distinct health check types that serve different purposes:

**Liveness**: Is the process alive and not deadlocked? A liveness check answers "should this instance be restarted?" It should be extremely simple and fast — a deadlocked application might still respond to a simple liveness probe even while failing all real requests, but at least it would fail eventually. The key property: liveness checks should never fail unless the process itself is in an unrecoverable state. Failing a liveness check causes a restart, which is expensive and disruptive.

**Readiness**: Is the instance ready to receive traffic? A readiness check answers "should this instance be in the load balancer rotation?" It can include checks for required dependencies (database connected, configuration loaded) but should not fail due to temporary overload or non-critical dependency degradation. Failing a readiness check removes the instance from the load balancer but does not restart it.

**Startup**: Has the application finished its initialization sequence? A startup check is used during application boot before the readiness probe takes over. This prevents Kubernetes from prematurely killing a slow-starting application that hasn't finished loading its initial state.

### Shallow vs. Deep Health Checks

The key design decision for readiness checks is how deep to go — how many dependencies to verify.

**Shallow health checks** verify only the instance's own health: can it handle a request? Is its in-memory state consistent? Has it loaded required configuration? A shallow check passes even if external dependencies are degraded, as long as the instance itself could handle requests if dependencies were healthy.

**Deep health checks** verify dependencies: can the instance connect to the database? Can it reach the cache? Can it communicate with required services? A deep check fails if any dependency is unavailable.

The problem with deep health checks: if a dependency is unhealthy and is shared by all instances, all instances fail their deep health checks simultaneously. The load balancer removes all instances from rotation. The service is completely down even though all instances are individually healthy and could serve some requests (with graceful degradation or fallbacks).

**The rule**: health checks should verify that the instance itself can serve requests, not that all dependencies are healthy. Dependency health is a concern for monitoring and alerting, not for traffic routing decisions.

Exceptions: if a dependency is truly required and there is no fallback — if the instance literally cannot serve any request without it — then checking that dependency in the readiness probe is appropriate. A database that stores every piece of state the service needs, with no cache and no fallback, is a required dependency. But a recommendation service that provides optional personalization data is not.

### What to Check

**Always appropriate to check:**
- The HTTP listener is bound and accepting connections
- Required configuration is loaded (the application parsed its config on startup)
- Required secrets are accessible (credentials loaded at startup)
- Critical in-memory state is initialized (e.g., the routing table is loaded)
- Database connectivity (for the primary required database, not for optional dependencies)

**Check with caution (only if truly required):**
- Downstream service connectivity (only if the service cannot function at all without it)
- Message queue connectivity (only if queue processing is required for all requests)

**Never appropriate to check:**
- Third-party service health (external APIs, CDNs — you don't control them)
- Optional dependency health (recommendation service, analytics service)
- Current load or queue depth (these are operational metrics, not health state)
- Downstream service latency (a slow but functioning dependency should not fail the health check)

### Kubernetes Probes

Kubernetes implements all three probe types natively. The distinction matters operationally:

**Liveness probe**: If it fails, Kubernetes kills and restarts the container.
- Use for: detecting deadlocks, infinite loops, unrecoverable states
- Should be: extremely simple, nearly always pass
- Failure consequence: container restart (disrupts in-flight requests)

**Readiness probe**: If it fails, Kubernetes stops sending new traffic to the pod but does not kill it.
- Use for: detecting when an instance is not ready to serve (starting up, temporarily overloaded, required dependency unavailable)
- Should check: required dependencies and initialization state
- Failure consequence: removed from service endpoints (traffic routed to other pods)

**Startup probe**: If it fails too many times during startup, Kubernetes kills the container and tries again.
- Use for: slow-starting applications that need more time than the liveness probe allows
- Should check: whether initialization is complete
- Failure consequence: container restart if startup exceeds deadline

## Deep Dive

Nygard's *Release It!* names the failure mode that motivates this entire article: "liveness theater" — health checks that always return success regardless of the service's actual ability to serve requests. A web server that accepts connections on port 80 and returns HTTP 200 from a hardcoded string satisfies a naive health check while being completely unable to handle real application requests. The load balancer continues routing traffic to it; all those requests fail at the application layer. The health check's purpose — protecting the service's traffic routing from instance-level failures — is entirely defeated. Nygard's prescription is to route the health check through enough of the application stack to actually verify request handling: the health check should fail if the application cannot handle a real request, not just if the process is alive.

The Builder's Library's distinction between "traffic health" and "dependency health" resolves the tension between Nygard's prescription and the deep health check failure mode. Traffic health answers: can this instance handle a request right now? If yes, return 200; if no, return 503. Dependency health answers: are all of this instance's dependencies operating correctly? Dependency health is useful information — it belongs in monitoring dashboards, structured logs, and the diagnostic payload of the health endpoint — but it is not the right criterion for traffic routing decisions. An instance whose optional recommendation service is degraded can still handle checkout requests; removing it from the load balancer because the recommendation service is slow would reduce total cluster capacity for no user benefit. The Builder's Library makes this separation architectural: the status code returned by the health endpoint reflects traffic health only; the response body may include dependency health for diagnostic purposes but must not influence the status code.

The Kubernetes probe taxonomy — liveness, readiness, startup — represents a significant refinement over the single health check model that preceded it. The refinement encodes a specific insight: the correct response to different "unhealthy" states is different. A deadlocked process should be killed and restarted (liveness failure consequence). A process that has lost its database connection should be taken out of rotation but not killed — it may recover when the database comes back (readiness failure consequence). A process that is still initializing its in-memory state should neither be killed nor receive traffic yet, but also should not be treated as failed (startup probe purpose). These three states require three different infrastructure responses, and conflating them into a single health check forces the infrastructure to make a binary kill-or-keep-alive decision for situations that warrant nuanced responses.

The SRE Book's chapter on monitoring distributed systems connects health endpoints to the broader observability infrastructure through the concept of "symptom-based alerting." The SRE Book argues that alerts should fire on symptoms that affect users, not on causes that may or may not affect users. A CPU spike is a cause; high latency or elevated error rates are symptoms. Health endpoints that reflect actual request-serving capability are symptom-based: they fail when the instance cannot serve requests, which is exactly the user-visible symptom. Health endpoints that fail when CPU exceeds 80% are cause-based: CPU spikes may or may not affect request handling, and firing health check failures on CPU spikes removes capacity from the load balancer when the service may actually still be serving requests correctly.

The fleet-wide health monitoring pattern — alerting when a fraction of instances are simultaneously unhealthy — addresses a failure mode that per-instance health checks cannot catch: the cascade where a shared dependency failure causes all instances to fail their readiness probes simultaneously. The Builder's Library documents this as one of the most dangerous consequences of deep health checks: if all 100 instances check an optional dependency and that dependency becomes slow, all 100 instances fail their health checks, all 100 are removed from the load balancer rotation, and the service has a complete outage from what should have been a gracefully degradable partial failure. Fleet-wide monitoring distinguishes this pattern from single-instance failures: if 95% of instances fail health checks simultaneously, the problem is a shared dependency, not individual instance failures. The correct response is to stop removing instances from rotation (maintaining available capacity) and investigate the shared dependency.

Kleppmann's *DDIA* provides context for health endpoint design within the broader landscape of monitoring and observability. DDIA distinguishes between metrics (aggregated numerical data over time), events (discrete records of individual occurrences), and traces (records of request flows across service boundaries). Health endpoints contribute to all three: the HTTP response codes are events, the response latency is a metric, and the component health payload can include trace context for debugging. DDIA's analysis of what makes monitoring systems useful — they should help you understand what is happening, not just that something is wrong — applies directly to health endpoint design: a health endpoint that returns only a status code tells the load balancer what to do but tells operators nothing about why. A health endpoint that includes component health, latency measurements, and version information provides the diagnostic context that makes the difference between a 5-minute and a 45-minute incident resolution.

## Implementation Guide

### Step 1: Implement the Three Probe Types

For Go with a standard HTTP server:

```go
func registerHealthEndpoints(mux *http.ServeMux, db *sql.DB, config *Config) {
    // Liveness: Is the process alive?
    // Simple, fast, almost never fails
    mux.HandleFunc("/healthz/live", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte(`{"status":"alive"}`))
    })
    
    // Readiness: Is the instance ready to receive traffic?
    // Checks required dependencies
    mux.HandleFunc("/healthz/ready", func(w http.ResponseWriter, r *http.Request) {
        ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
        defer cancel()
        
        if err := db.PingContext(ctx); err != nil {
            w.WriteHeader(http.StatusServiceUnavailable)
            json.NewEncoder(w).Encode(map[string]string{
                "status": "not_ready",
                "reason": "database_unavailable",
            })
            return
        }
        
        if !config.IsLoaded() {
            w.WriteHeader(http.StatusServiceUnavailable)
            json.NewEncoder(w).Encode(map[string]string{
                "status": "not_ready",
                "reason": "config_not_loaded",
            })
            return
        }
        
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"status": "ready"})
    })
    
    // Startup: Has initialization completed?
    // Used during container startup
    mux.HandleFunc("/healthz/startup", func(w http.ResponseWriter, r *http.Request) {
        if !appState.InitializationComplete() {
            w.WriteHeader(http.StatusServiceUnavailable)
            return
        }
        w.WriteHeader(http.StatusOK)
    })
}
```

### Step 2: Add Diagnostic Information

Health endpoints that only return 200/503 are minimally useful for debugging. Add structured diagnostic information:

```go
type HealthResponse struct {
    Status     string                       `json:"status"`
    Version    string                       `json:"version"`
    Uptime     string                       `json:"uptime"`
    Components map[string]ComponentHealth   `json:"components"`
}

type ComponentHealth struct {
    Status  string  `json:"status"`
    Message string  `json:"message,omitempty"`
    Latency float64 `json:"latency_ms,omitempty"`
}

func buildHealthResponse(db *sql.DB) HealthResponse {
    components := map[string]ComponentHealth{}
    
    // Check database
    start := time.Now()
    if err := db.Ping(); err != nil {
        components["database"] = ComponentHealth{
            Status: "unhealthy",
            Message: err.Error(),
        }
    } else {
        components["database"] = ComponentHealth{
            Status:  "healthy",
            Latency: float64(time.Since(start).Milliseconds()),
        }
    }
    
    // Check cache (non-required — informational only)
    start = time.Now()
    cacheStatus := "healthy"
    if err := cache.Ping(); err != nil {
        cacheStatus = "degraded"  // Not failing the health check, just informational
    }
    components["cache"] = ComponentHealth{
        Status:  cacheStatus,
        Latency: float64(time.Since(start).Milliseconds()),
    }
    
    // Determine overall status: unhealthy if any REQUIRED component is unhealthy
    overallStatus := "healthy"
    if components["database"].Status == "unhealthy" {
        overallStatus = "unhealthy"
    }
    
    return HealthResponse{
        Status:     overallStatus,
        Version:    buildInfo.Version,
        Uptime:     time.Since(startTime).String(),
        Components: components,
    }
}
```

### Step 3: Configure Kubernetes Probes

```yaml
spec:
  containers:
  - name: api-server
    livenessProbe:
      httpGet:
        path: /healthz/live
        port: 8080
      initialDelaySeconds: 10   # Wait 10s before first check
      periodSeconds: 10          # Check every 10s
      failureThreshold: 3        # Kill after 3 consecutive failures (30s)
      timeoutSeconds: 2          # Fail if response takes >2s
    
    readinessProbe:
      httpGet:
        path: /healthz/ready
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 10
      failureThreshold: 3        # Remove from rotation after 3 failures (30s)
      successThreshold: 1        # Return to rotation after 1 success
      timeoutSeconds: 2
    
    startupProbe:
      httpGet:
        path: /healthz/startup
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
      failureThreshold: 30       # Kill if not started within 150s (30 × 5s)
      timeoutSeconds: 2
```

### Step 4: Protect Health Endpoints from Abuse

Health endpoints must always respond, even under high load. Protect them:

```go
// Health endpoints get their own goroutine pool, separate from request handling
// They cannot be starved by request traffic

// Separate port for health checks (avoids port exhaustion from request traffic)
go http.ListenAndServe(":8081", healthMux)  // Health port
go http.ListenAndServe(":8080", requestMux) // Request port

// Health checks bypass auth middleware
// (load balancers and orchestrators don't send auth headers)
```

Don't apply the same rate limiting to health endpoints that you apply to API endpoints. A load balancer checking health every 30 seconds across 100 pods is 3.3 health checks per second — this is trivial traffic but could be rate-limited by aggressive rate limiters.

### Step 5: Include Build Information

Health endpoints should expose build/version information for deployment validation:

```json
{
  "status": "healthy",
  "build": {
    "version": "2.3.1",
    "git_commit": "abc123def",
    "built_at": "2024-01-15T09:00:00Z",
    "deployed_at": "2024-01-15T10:30:00Z"
  }
}
```

Deployment pipelines can verify that the new version is actually running by checking the `build.version` field rather than just checking that the health check passes. This catches cases where the deployment failed silently and the old version is still running.

### Step 6: Monitor Health Check Failure Rate Across the Fleet

Don't just act on individual instance health failures — monitor fleet-wide patterns:

```promql
# Fraction of instances currently failing readiness
(
  count(up{job="api-server"} == 0) 
  / 
  count(up{job="api-server"})
) > 0.1  # Alert if >10% of instances are unhealthy
```

Fleet-wide health degradation (many instances simultaneously failing health checks) often indicates a shared dependency issue rather than individual instance problems. This alert pattern catches these cases before the load balancer removes all instances.

## When to Use / When NOT to Use

**Always implement:**
- Liveness probe: Every HTTP service should expose one
- Readiness probe: Every service deployed behind a load balancer
- Startup probe: Any service with initialization taking more than 10-15 seconds

**Readiness check depth:**
- Include required database connectivity (if no DB = can't serve any requests)
- Include configuration loading state (if config not loaded = can't serve correctly)
- Do NOT include optional dependency health
- Do NOT include current load or queue depth

**Do NOT implement:**
- Health checks that always return 200 (useless liveness theater)
- Health checks that verify all transitive dependencies (causes total outage from partial failure)
- Health checks that are expensive to run (they're called every 10-30 seconds at high frequency)

## Common Mistakes

**Deep health checks that fail when any dependency degrades**: If all instances check the recommendation service and the recommendation service is slow, all instances fail their health checks and are removed from rotation. Total outage from a partial, degradable dependency failure.

**Liveness probes too aggressive**: A liveness probe with a 5-second timeout and 2-failure threshold will restart a container that briefly paused for garbage collection. Set failure thresholds to avoid false positives (3-5 failures before restart).

**Health endpoint that bypasses the real request path**: A health check that writes "OK" directly to the response without going through the application's middleware, routing, and handler code is checking that the process is alive, not that it can handle requests. Route health checks through enough of the stack to verify real request handling.

**No build information in health response**: Deployment validation is much harder when you can't verify which version is running. Always include version/commit information.

**Same health endpoint for liveness and readiness**: These serve different purposes and should have different behavior. A readiness failure should not cause a restart. Use separate endpoints.

**Health check timeout longer than the probe timeout**: If your health check queries the database with a 5-second timeout but the Kubernetes probe times out after 2 seconds, the probe always times out before the database check completes. Health check timeout must be shorter than the probe timeout.

**Not removing health checks from rate limiting**: A load balancer that gets rate-limited when checking health will treat the 429 as a health failure and remove the instance from rotation.

## Connections

**Load shedding (Article 04)**: When load shedding is active, the health endpoint should still return 200 (the instance is healthy; it's just overloaded). Load shedding is not a health failure — it's a capacity management decision. The health endpoint should not reflect load shedding state.

**Graceful degradation (Article 09)**: Non-critical dependency failures should trigger graceful degradation at the application level, not health check failures. The health check passes; the application serves a degraded experience.

**Static stability (Article 06)**: Health checks should not fail when the control plane is unavailable. If the configuration service is unreachable, but the cached configuration is sufficient to serve requests, the health check should pass.

**Safe deployments (Article 14)**: Deployment pipelines use health endpoints to validate each deployment stage. The readiness probe is the deployment gate: a new instance must pass its readiness probe before the old instance is decommissioned.

**Chaos engineering (Article 08)**: Chaos experiments should verify health check behavior: does the instance correctly report "not ready" when its required database is unavailable? Does it report "alive" even when temporarily overloaded?

## Key Insights

The design principle for health endpoints is: report what the load balancer needs to know, not everything you know. The load balancer needs to know "should I send traffic here?" — that's the readiness check. It does not need to know "is the recommendation service slow?" or "is the cache hit rate below normal?" Those are operational metrics for dashboards, not traffic routing decisions.

The failure mode to prevent at all costs: the cascade where a shared dependency failure causes all instances to fail their health checks simultaneously, resulting in no instances in rotation, resulting in a complete outage from what should have been a partial degradation. This cascade is entirely caused by over-deep health checks. The fix is removing non-required dependencies from health checks and handling their degradation through graceful degradation patterns instead.

Build information in health responses deserves emphasis as an underappreciated feature. During a deployment investigation — "is version 2.3.1 actually running?" — being able to hit `/healthz/ready` on any instance and see the version number is invaluable. It costs nothing to add, and the value during incidents is disproportionately high.

The three Kubernetes probe types map to a clean mental model: startup (am I done initializing?), liveness (am I alive and not deadlocked?), readiness (am I ready for traffic?). Conflating these — using a single endpoint for all three purposes — means accepting the wrong behavior: restarting instances that should just be taken out of rotation, or failing to restart instances that are actually deadlocked. The separation exists because the correct response to each state is different, and getting the response right matters for both availability and resource efficiency.
