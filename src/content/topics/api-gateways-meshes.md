---
title: 'API Gateways & Service Meshes'
description: 'The traffic layer: where authentication, routing, rate limiting, and mTLS live — so services do not have to.'
readingTime: 12
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

An API gateway is a reverse proxy fronting your services. It terminates TLS, routes requests to backends, enforces rate limits, handles authentication, and returns responses. A service mesh is the same idea but for service-to-service traffic: lightweight proxies (sidecars) are deployed alongside each service, intercepting all traffic and providing mTLS, load balancing, circuit breaking, and retries without the services knowing.

Both are about hoisting cross-cutting concerns out of individual services and into infrastructure. Rate limiting doesn't live in ten services; it lives in the gateway. mTLS doesn't need to be coded in every service; the mesh handles it.

The cost is operational: a gateway or mesh is another system to operate, debug, and scale. It only pays off when you have enough services that duplicating logic is expensive.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Push operational concerns into infrastructure. The more services you have, the more valuable it is to have one place where cross-cutting logic lives.

</div>

## <span class="tpl">02</span>Mental Model

A city with a toll booth (gateway) at the entrance. All cars (requests) pass through; the booth checks permits (auth), counts vehicles (rate limiting), and directs traffic (routing). Inside the city, roads (inter-service communication) have their own checkpoints (mesh sidecars) to prevent congestion and ensure safe passage.

## <span class="tpl">03</span>Real-World Example

**A microservices deployment with Kong (gateway) and Istio (service mesh).** Requests enter through Kong: it authenticates via JWT, enforces rate limits per user, and routes to the appropriate service. Inside, five services communicate; Istio sidecars on each ensure mTLS, load balance, and retry on transient failures. A new service is added; the existing services don't change code, they just get a sidecar, and they can immediately call it securely. A rate-limit rule changes; you update the gateway, not fifty services.

## <span class="tpl">04</span>Common Mistakes

- **Gateway or mesh without clear ownership.** Ops inherits a system no one understands; it becomes the blame-shifter ("it's the mesh") for all latency.
- **Over-powerful gateways.** Every business rule ends up in the gateway; it becomes unmaintainable monolith.
- **Network policies that don't match the mesh.** A mesh says "A can talk to B" but Kubernetes network policies say otherwise; debugging is a nightmare.
- **Ignoring the latency cost.** Sidecars add a hop; mTLS adds handshake cost. Measure and decide if the trade-off is acceptable.

## <span class="tpl">05</span>Interview Perspective

Gateways and meshes appear in large-scale design interviews. The strong answer: "At N services, having each service handle auth/rate-limits/retries is expensive; a gateway (inbound) and mesh (inbound service-to-service) handle it once. Trade-off: operational complexity and latency for code simplicity and consistency." Mentioning that auth/rate-limiting are *gateways*, while mTLS/retries are *meshes* shows nuance.

## <span class="tpl">06</span>Code / Pseudocode

```yaml
# Gateway: authenticate and route
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api-gateway
spec:
  hosts:
  - api.example.com
  http:
  - match:
    - uri:
        prefix: /orders
    route:
    - destination:
        host: orders-service
        port:
          number: 8080
  - match:
    - uri:
        prefix: /payments
    route:
    - destination:
        host: payment-service
        port:
          number: 8080

# Service mesh: mutual TLS between services
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
spec:
  mtls:
    mode: STRICT  # all traffic must be mTLS
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: orders-service
spec:
  host: orders-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 60s
```

## <span class="tpl">07</span>Related Concepts

- **Microservices** — gateways and meshes make many services manageable.
- **Authentication & Authorization** — the gateway is where edge auth lives.
- **Error Handling & Resilience** — the mesh provides circuit breakers and retries.
- **Observability** — mesh proxies emit the telemetry you observe.

**Source material:** Kong documentation for gateways; Istio documentation for service meshes; the *Istio in Action* book for practical patterns.

</div>

<div class="pane pane-build">

## Build Tasks — API Gateways & Service Meshes

### Task 1 — Gateway auth and routing
Set up a gateway (Kong, Nginx, Envoy) that authenticates incoming requests and routes to two backends.
- **Done when:** authenticated requests reach the service; unauthenticated are rejected at the gateway.

### Task 2 — Service mesh sidecars
Deploy two services with Istio sidecars. Configure mTLS between them.
- **Done when:** traffic is encrypted end-to-end and plain-text connections are rejected.

### Task 3 — Mesh observability
Enable Istio's metrics and visualize traffic (service-to-service communication) in a tool like Kiali.
- **Done when:** you can see request rates, latencies, and error rates per service pair.

</div>
