---
title: 'Error Handling & Resilience'
description: 'In distributed systems, failure is the steady state, not the exception. Resilience is designing so that partial failure stays partial.'
readingTime: 13
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

At scale, something is always broken: a node is slow, a dependency is down, a network is partitioned. The goal is not preventing failure — it's containing it, so one failed dependency degrades one feature instead of toppling the whole system. The toolkit is small and composable:

- **Timeouts** — never wait forever. An unbounded wait turns a slow dependency into a hung thread into an exhausted pool into a dead service. Every network call has connect and read timeouts.
- **Retries with backoff + jitter** — for *transient* failures only, and only on *idempotent* operations. Naive immediate retries amplify an outage into a self-inflicted DDoS; exponential backoff with randomized jitter spreads the load.
- **Circuit breakers** — after N consecutive failures, stop calling a sick dependency entirely for a cooldown, failing fast instead of piling up timeouts. Lets the dependency recover and frees your resources.
- **Bulkheads** — isolate resource pools (separate connection pools/thread pools per dependency) so one drowning dependency can't consume the capacity the others need.
- **Graceful degradation & fallbacks** — serve stale cache, a default, or a reduced feature instead of an error. The recommendations service is down? Show popular items, not a 500.

<div class="concept-card">
<div class="cc-label">Core principle</div>

The dangerous failure is not the crash — it's the *cascade*: a slow dependency holding threads that back up requests that exhaust pools that take down healthy parts of the system. Resilience patterns exist to break the chain at each link.

</div>

## <span class="tpl">02</span>Mental Model

Think of your service as a **building with fire doors**. A fire (failing dependency) is inevitable; the design question is whether it's contained to one room or consumes the building. Timeouts are smoke detectors — they notice trouble before it spreads. Circuit breakers are the fire doors that slam shut, sealing off the burning room so the rest stays habitable. Bulkheads are the load-bearing walls between sections. Without them, the standard catastrophe unfolds: one slow database fills every worker's wait queue, and a service that should have lost one feature loses everything — the difference between a degraded checkout and a total outage is whether those doors existed.

## <span class="tpl">03</span>Real-World Example

**A product page calling four backends** (catalog, pricing, inventory, recommendations). Two are critical (catalog, pricing — no page without them), two are optional (inventory hint, recommendations). Resilient design treats them differently: critical calls get tight timeouts + retries + a circuit breaker, and if they trip, the page returns a clear 503. Optional calls get short timeouts and *fallbacks* — recommendations behind a circuit breaker that, when open, instantly returns cached "popular items" with zero wait. When recommendations has an outage, users never notice; the breaker fails fast, the fallback fills in, and the on-call engineer sees a dashboard alert instead of a paging storm. This is the architecture *Release It!* calls stability patterns, and it's why mature systems degrade in slices rather than all at once.

## <span class="tpl">04</span>Common Mistakes

- **No timeout, or the same generous timeout everywhere.** The single most common cause of cascading failure. A 30s default timeout means a dead dependency holds your worker for 30s × every queued request.
- **Retrying non-idempotent operations.** Retrying a charge or a "send email" after a timeout double-charges and double-sends. Retry only what's safe to repeat (pair with idempotency keys from API Design).
- **Retry storms.** Every client retrying immediately and simultaneously hammers a recovering service back down. Always exponential backoff *with jitter*; consider retry budgets.
- **Catch-and-swallow.** `except: pass` hides failures until they surface as corrupt data far away. Handle, fallback, or propagate — never silently drop.
- **No circuit breaker on a flaky dependency.** Without one, your threads pile up in timeouts against a dead service; with one, you fail fast and recover capacity instantly.

## <span class="tpl">05</span>Interview Perspective

Resilience is what separates a junior design ("call service B") from a senior one ("call B with a 200ms timeout, one retry with backoff, a circuit breaker, and a cached fallback if it's non-critical"). Interviewers escalate with "what if B is slow?" (not down — *slow*, the harder case) and want to hear the cascade described and the fire doors named. The capstone follow-up — "what if your retries make the outage worse?" — is answered with jitter, backoff, and circuit breakers. Mentioning the distinction between *fail fast* and *fail safe*, and which dependencies deserve which, signals real operational experience.

## <span class="tpl">06</span>Code / Pseudocode

```python
# Timeout + bounded retry with backoff/jitter + circuit breaker, composed.
import asyncio, random, time

class CircuitBreaker:
    def __init__(self, threshold=5, cooldown=30):
        self.fails = 0; self.opened_at = None
        self.threshold = threshold; self.cooldown = cooldown
    def allow(self) -> bool:
        if self.opened_at and time.time() - self.opened_at < self.cooldown:
            return False                       # OPEN: fail fast, don't even try
        return True
    def record(self, ok: bool):
        if ok: self.fails = 0; self.opened_at = None
        else:
            self.fails += 1
            if self.fails >= self.threshold: self.opened_at = time.time()

breaker = CircuitBreaker()

async def call_with_resilience(fn, *, retries=2, fallback=None):
    if not breaker.allow():
        return fallback() if fallback else (_ for _ in ()).throw(ServiceDown())
    for attempt in range(retries + 1):
        try:
            result = await asyncio.wait_for(fn(), timeout=0.2)   # hard timeout
            breaker.record(True)
            return result
        except (asyncio.TimeoutError, TransientError):
            breaker.record(False)
            if attempt == retries:
                if fallback: return fallback()                   # degrade gracefully
                raise
            await asyncio.sleep((2 ** attempt) * 0.1 + random.random() * 0.1)  # backoff+jitter
```

## <span class="tpl">07</span>Related Concepts

- **API Design** — idempotency is what makes retries safe; status codes signal retryability.
- **Concurrency & Async Processing** — pool exhaustion is the mechanism of cascade.
- **Observability** — you can't tune timeouts or breakers you can't measure.
- **Cloud-Native Patterns** — queues as shock absorbers, designing for instance loss.

**Source material:** *Release It!* (Nygard) — the definitive book on stability/anti-stability patterns; the circuit breaker and bulkhead vocabulary comes from here. Google SRE Book chapters on handling overload and cascading failures.

</div>

<div class="pane pane-build">

## Build Tasks — Error Handling & Resilience

### Task 1 — Cause a cascade, then stop it
Build a service calling a mock dependency you can make slow (3s sleep). Send concurrent load with no timeout; watch your service's workers fill and healthy endpoints die. Add a 200ms timeout; watch containment.
- **Done when:** you've reproduced and then prevented the cascade, with worker-pool metrics before/after.

### Task 2 — Circuit breaker
Wrap the dependency in a breaker. Make the mock fail continuously; verify the breaker opens, requests fail fast (no 3s wait), and it half-opens after cooldown.
- **Done when:** open-state requests return in <5ms and recovery is automatic when the mock heals.

### Task 3 — Retry storm vs jitter
Make the mock fail transiently. Implement immediate-retry across 200 clients and graph the load spike on the mock; switch to backoff+jitter and graph again.
- **Done when:** the jittered version shows a smooth, bounded retry load.

### Task 4 — Graceful degradation
Add a non-critical "recommendations" call with a cached fallback behind a breaker.
- **Done when:** killing recommendations leaves the page fully functional with fallback content and no user-visible error.

</div>
