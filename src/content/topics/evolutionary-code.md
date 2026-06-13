---
title: 'Evolutionary Code & Refactoring'
description: 'Code changes as requirements change. The question is not whether to refactor, but whether to refactor safely — with seams and tests.'
readingTime: 11
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Legacy code is code without tests. Once tests are absent and the code is running in production, every change becomes a bet — does the refactor work? You don't know until it breaks at 2 a.m. Evolutionary architecture is the practice of changing systems gradually, one seam at a time, with tests, so that refactors are safe.

The toolkit:

- **Seams** — places in code where the behavior can be changed without modifying the calling code. A seam allows testing without hitting the database, or replacing a library without rewriting the call site.
- **Strangler Fig pattern** — gradually replace an old system with a new one by intercepting calls and routing them. Old and new run together; requests gradually move to new; old is decommissioned.
- **Bounded contexts as service boundaries** — what were internal seams become service boundaries; old and new services run in parallel.
- **Feature flags** — deploy new code disabled, enable gradually, disable if broken.

The goal is never having a moment where "the old system breaks, so we flip to the new one." Instead, old and new coexist, requests migrate gradually, and the transition is invisible to users.

<div class="concept-card">
<div class="cc-label">Core principle</div>

A system in production is a living thing. It doesn't refactor; it evolves. The architecture that supports evolution is one with seams and tests, where you change in small, safe steps.

</div>

## <span class="tpl">02</span>Mental Model

A city that can't close a street for renovation because traffic must keep flowing. So it builds a new street in parallel, gradually routes traffic to it, and only when the old street has zero traffic can it be torn down. Evolution, not replacement. This is how production systems change.

## <span class="tpl">03</span>Real-World Example

**A payment system refactor that can't go down.** The old system is a ball of mud; new architecture uses events and sagas. Solution: a new service runs alongside the old. Requests are routed: 1% to new, 99% to old. If the new service's error rate spikes, traffic is instantly rerouted to old — no downtime. Over a month, 100% of requests are on new. The old service is deleted. No deployment that stops payment; no "big bang" migration; evolution.

## <span class="tpl">04</span>Common Mistakes

- **Big-bang rewrites.** Two years of development, then one deploy that breaks everything. Evolutionary code means delivering value *every* step.
- **No seams.** Tightly coupled code can't evolve; every change breaks everything. Seams are prerequisites.
- **Tests added *after* code is written.** If code is already in production and untested, tests are archaeology, not forward motion. Start with tests.
- **Feature flags as a dumping ground.** Flags left in code forever become technical debt. Set a TTL on every flag; it must be removed.

## <span class="tpl">05</span>Interview Perspective

Evolutionary architecture is probed with "how do you refactor a system that's running in production?" The strong answer: "I use seams and feature flags; new code runs alongside old, controlled by flags; once confident, I migrate traffic gradually. No moment where everything stops and switches."

## <span class="tpl">06</span>Code / Pseudocode

```python
# SEAMS: make the system testable and swappable

# Hard dependency — not testable
class OrderService:
    def __init__(self):
        self.db = RealPostgresDB()

# Seam — dependency injected, testable
class OrderService:
    def __init__(self, db):
        self.db = db

# Strangler — route based on a flag
@router.post("/orders")
async def create_order(req):
    if feature_enabled("new_order_service"):
        return await new_service.place_order(req)
    else:
        return await old_service.place_order(req)

# Gradually move traffic
if feature_enabled_for_user(user_id, "new_order_service"):
    service = new_service
else:
    service = old_service
```

## <span class="tpl">07</span>Related Concepts

- **Testing** — seams and tests are prerequisites for evolution.
- **Backend Architecture** — architecture that supports seams is prerequisite.
- **Microservices** — service boundaries are seams at the system level.

**Source material:** *Working Effectively with Legacy Code* (Feathers) ch. 3–4 on seams and dependencies; *Microservice Architecture* (Newman) on strangler figs.

</div>

<div class="pane pane-build">

## Build Tasks — Evolutionary Code

### Task 1 — Identify seams in legacy code
Take a production system. Find three places where behavior could change without modifying the call site (seams). Document them.
- **Done when:** you have seams identified and a refactor plan for each.

### Task 2 — Add a seam via dependency injection
Take one tight dependency. Inject it; now the code is testable with a fake. Add a test.
- **Done when:** the code is tested without the real dependency.

### Task 3 — Strangler pattern
Run an old and new implementation in parallel. Route 5% of traffic to new. Monitor and gradually increase.
- **Done when:** 100% of traffic is on new and old is removed; zero downtime throughout.

</div>
