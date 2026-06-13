---
title: 'Compute Models (VMs → Serverless)'
description: 'Control vs. operations. VMs give you freedom and burden you with management. Serverless gives you scale but locks you into a vendor. The gradient has no universally right answer.'
readingTime: 10
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

The progression of abstraction:

- **Bare metal / VMs** — you own the hardware (or rent it); OS down. Full control, full operations burden (patching, capacity planning, security, scaling).
- **Containers** — bundle your app + dependencies; the cloud runs them. Less ops (no OS patching), more visibility than serverless.
- **Platform-as-a-Service (PaaS)** — tell the cloud your app; it scales, deploys, runs. Hidden operations, less control.
- **Functions (Serverless)** — pay per execution. No servers to manage, automatic scaling to zero, but cold starts, vendor lock-in, and complexity hiding in the platform.

The trade is always the same: lower down the stack = more control + more operations. Higher = simpler operations + less control + potentially higher cost.

<div class="concept-card">
<div class="cc-label">Core principle</div>

The "best" compute model is the one where operations overhead doesn't exceed engineering capacity. A startup benefits from serverless (no ops team); a cloud provider needs VMs (control + customization).

</div>

## <span class="tpl">02</span>Mental Model

A restaurant. Bare metal is owning the restaurant: full control, you buy supplies, fix equipment, hire staff. Containers are a food truck: you own the truck, the cloud is the street. PaaS is a food hall (the shared infrastructure); you cook, the hall handles customers and cleanup. Serverless is a catering service: you write recipes, the service handles everything.

## <span class="tpl">03</span>Real-World Example

**A startup's journey.** Start with serverless (Lambda) — zero ops, focus on product. As traffic grows and vendor costs spike, migrate to containers on EKS — better cost efficiency, more control. At scale, run Kubernetes on bare metal in a datacenter — final cost control. Each step traded ops burden for cost/control.

## <span class="tpl">04</span>Common Mistakes

- **Underestimating ops cost of VMs/Kubernetes.** Scale is not free; it requires a dedicated ops team.
- **Serverless without a cost model.** Automatic scaling sounds free; it's not. A cached request costs nearly zero; an uncached request costs real money.
- **Premature optimization.** Don't move off serverless because "it's expensive at scale" without measuring. Many services stay on serverless and scale fine.

## <span class="tpl">05</span>Interview Perspective

Compute models are probed with "how do you scale this?" The answer depends on the service: "Read-heavy, cacheable content? Serverless with a cache layer. Stateful, high-throughput? Containers with auto-scaling. Critical infrastructure? Bare metal or reserved instances with precise capacity planning."

## <span class="tpl">06</span>Code / Pseudocode

```python
# The same app, different compute models

# SERVERLESS — no servers, pay per invocation
@app.post("/charges")  # Lambda handler
async def charge(request):
    return await process_charge(request)

# CONTAINERS — you manage the container image, cloud runs it
FROM python:3.11
COPY app.py .
CMD ["uvicorn", "app:app"]

# KUBERNETES — you manage replicas and resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: charges-api
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: app
        image: charges-api:v1.2
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
```

## <span class="tpl">07</span>Related Concepts

- **Cloud-Native Patterns** — serverless + containers enable new architectural patterns.
- **Deployment & CI/CD** — each model requires different deployment strategies.

**Source material:** Cloud provider documentation (AWS Lambda, Google Cloud Run, Azure Functions for serverless; ECS/EKS/AKS for containers; GCE/EC2 for VMs).

</div>

<div class="pane pane-build">

## Build Tasks — Compute Models

### Task 1 — Deploy the same app to two models
Deploy a simple API to serverless (Lambda/Cloud Run) and containers (ECS/Kubernetes). Compare cold start time, scaling behavior, and costs under load.
- **Done when:** you have before/after metrics for both.

### Task 2 — Measure the ops burden
Run containers yourself for one week. Count hours spent on scaling, debugging, patching. Compare to serverless (should be near zero).
- **Done when:** you've experienced the ops trade-off directly.

</div>
