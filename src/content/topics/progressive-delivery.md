---
title: 'Progressive Delivery'
description: 'Deploys are not binary. Canaries, feature flags, and automated rollback turn a moment of terror into a measured, observable process.'
readingTime: 11
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Progressive delivery is the practice of rolling out changes to *some* users first, measuring the impact, and rolling back or proceeding based on *signals*, not hope. The techniques:

- **Canary deployments** — send 1–10% of traffic to the new version; if error rate or latency degrades, roll back automatically before the whole fleet is affected.
- **Blue-green deployments** — run two full deployments in parallel; switch traffic when the new one is healthy.
- **Feature flags** — deploy code but disable features, enabling them gradually. Decouples deployment from activation.
- **Automated rollback** — bad signals (high error rate, latency spike) trigger automatic rollback without human approval.

The signal that gates the rollout is *observability*: if you can't measure the impact in real time, you can't deploy progressively. It is why observability (the earlier topic) is the prerequisite for velocity.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Every deploy is an experiment. If you can't measure the result and roll back in <5 minutes, the deploy is not progressive — it is optimistic hope.

</div>

## <span class="tpl">02</span>Mental Model

A airline testing new routes. Instead of retiring the old route and betting everything on the new one, they run both for a month: if the new route fills and old metrics stay healthy, expand. If there's a problem, revert. Progressive delivery is the same: run old and new in parallel, watch, and decide.

## <span class="tpl">03</span>Real-World Example

**A checkout changes from 2-step to 3-step payment flow.** Launch as a feature flag; enable for 5% of users. Monitor error rate, completion rate, latency. At 1% error rate on the new flow vs 0.1% on the old, disable the flag and investigate. At parity, enable 25%, then 100%. The entire rollout is observable and reversible. On the day a bug slips through (it will), the high error rate on the new version triggers automatic rollback within 2 minutes; 95% of users never see it.

## <span class="tpl">04</span>Common Mistakes

- **No rollback plan.** A canary that cannot roll back in <5 minutes is a delayed disaster. Rollback must be *faster* than rolling forward.
- **Bad signal selection.** Monitoring error rate catches bugs but misses silent data corruption (logging the wrong user ID). Choose signals that match the risk.
- **Canaries with wrong traffic.** A canary with only internal traffic or a single timezone will miss geographic failures. Route real, representative traffic.
- **Too-slow rollout.** A 1% canary that takes 5 hours to expand to 10% means a bad deploy is slow-release. Find the sweet spot: 2–5 minutes per step.

## <span class="tpl">05</span>Interview Perspective

Progressive delivery is probed with "how do you deploy safely?" The strong answer names the technique (canary or feature flags), the signals (error rate, p99 latency, specific SLO), and the rollback criterion ("if error rate > 1%, roll back automatically"). Mentioning that observability enables progressivity shows the systems-thinking link. The question "how long does rollback take?" should have a number: <5 minutes is the standard.

## <span class="tpl">06</span>Code / Pseudocode

```python
# Canary: route 5% of traffic to new version; monitor; auto-rollback if bad signals.

# kubernetes/canary-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-canary
spec:
  replicas: 1  # 1 out of ~20
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:v2-candidate  # new version

---
# istio/virtual-service routes traffic
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
  - myapp
  http:
  - match:
    - headers:
        x-version:
          exact: canary
    route:
    - destination:
        host: myapp-canary
        port:
          number: 8080
    timeout: 10s
    retries:
      attempts: 1
      perTryTimeout: 5s
  - route:
    - destination:
        host: myapp-stable
        port:
          number: 8080
    weight: 95
    - destination:
        host: myapp-canary
        port:
          number: 8080
    weight: 5

---
# Monitoring rules
# If canary has error_rate > 0.5% OR p99 > 500ms, trigger rollback
```

## <span class="tpl">07</span>Related Concepts

- **Observability** — the prerequisite; without metrics, you're flying blind.
- **Deployment & CI/CD** — the pipeline that gates canary progression.
- **Error Handling & Resilience** — circuit breakers can trigger rollback.

**Source material:** *Continuous Delivery* (Humble & Farley) ch. 5 on deployment patterns; Google SRE Book ch. 15 on release engineering.

</div>

<div class="pane pane-build">

## Build Tasks — Progressive Delivery

### Task 1 — Canary with manual gates
Deploy version 2 to 10% of traffic; set an alert on error rate. Trigger a bad deploy and watch the canary; manually rollback.
- **Done when:** the canary detects the error and rollback is <1 minute.

### Task 2 — Automatic rollback
Add a rule: if error rate on canary > 1%, automatically roll back.
- **Done when:** a bad deploy is reversed without human intervention.

### Task 3 — Feature flag canary
Deploy a feature behind a flag; enable it for 5% of users. Incrementally increase to 100%.
- **Done when:** you enable the flag in the code without redeploying.

</div>
