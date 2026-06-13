---
title: 'Cloud-Native Patterns'
description: 'When infrastructure can fail, be stateless, and autoscale, the architecture changes: queues as shock absorbers, designed for ephemeral machines.'
readingTime: 10
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Cloud-native assumes: machines fail, are replaced, and scale automatically. Instances are cattle, not pets. The patterns that emerge:

- **Stateless services** — nothing persists on the instance. Scaling up is free (just more copies). State lives in a managed service (database, cache, object store).
- **Queues as buffers** — accept requests into a queue immediately (fast), process asynchronously (cheap). Load smoothing prevents cascade failures.
- **Graceful shutdown** — when Kubernetes evicts a pod, finish in-flight requests and stop accepting new ones (draining).
- **Health checks** — instances report health; the orchestrator removes unhealthy ones.
- **Observability everywhere** — you don't SSH into instances; you read logs and metrics.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Design for instance mortality. Every instance will fail; the system must survive it invisibly.

</div>

## <span class="tpl">02</span>Mental Model

A load balancer in front of many short-lived workers. A worker crashes? The load balancer routes around it. A spike in requests? More workers spin up automatically. No worker holds permanent state; all state is in a shared database. Workers are replaceable.

## <span class="tpl">03</span>Real-World Example

**A cloud-native checkout.** The API service is stateless; thousands of identical instances sit behind a load balancer. A request comes in, hits an instance, that instance fetches state from a database and returns. If the instance crashes mid-request, the request retries and hits another instance; the result is the same. Spikes are handled by autoscaling (Kubernetes launches more pods). No instance is special; no state is sticky.

</div>

<div class="pane pane-build">

## Build Tasks — Cloud-Native Patterns

### Task 1 — Stateless service with ephemeral instances
Deploy a service to Kubernetes. Delete a pod while it's processing requests. Verify requests are rerouted to other pods with no error.
- **Done when:** pod deletion is invisible to the client.

</div>
