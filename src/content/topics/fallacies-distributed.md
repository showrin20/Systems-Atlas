---
title: 'Fallacies of Distributed Computing'
description: 'Programmers believe eight assumptions about networks that are all wrong. Every distributed system failure is caused by one of these.'
readingTime: 9
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

In 1994, Peter Deutsch and James Gosling listed eight assumptions programmers make about networks that cause nearly every distributed system failure. They remain the most accurate diagnosis of why systems break when spread across machines:

1. **The network is reliable.** It isn't. Packets drop; timeouts occur; reordering happens.
2. **Latency is zero.** It isn't. Even local networks add milliseconds; cross-region adds hundreds.
3. **Bandwidth is infinite.** It isn't. You will saturate the link; a cache miss becomes a network saturation.
4. **The network is secure.** It isn't unless you make it so (TLS, mTLS).
5. **Topology doesn't change.** It does. Nodes disappear and reappear; connections shift.
6. **There is one administrator.** There isn't. Your services, third-party APIs, and the cloud provider all have separate failure domains.
7. **Transport cost is zero.** It isn't. Serialization, encryption, and network I/O have real latency and bandwidth cost.
8. **The network is homogeneous.** It isn't. Different protocols, reliability, and speeds coexist.

Every one of these is a common design assumption, and every one is subtly false. The engineer's job is designing *as if* all eight are false, so failures are contained.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Design your system assuming the network will betray you at the worst possible moment. If the system survives that, everything else is a bonus.

</div>

## <span class="tpl">02</span>Mental Model

Imagine a **city with a broken phone system**. Calls drop randomly, take variable times to connect, and sometimes loop back garbled. Every assumption about a working phone line is wrong. Would you design a hospital to call for blood via phone? Or a bank to settle transactions? You'd build redundancy, fallbacks, and acknowledgment protocols. That is designing for the true nature of networks.

## <span class="tpl">03</span>Real-World Example

**A payment system that ignored the fallacies.** The code assumes the payment gateway API responds in <100ms (fallacy 2: latency), never drops (fallacy 1: reliability), and every request succeeds (fallacy 3: saturation). A network glitch causes the gateway to slow; requests start timing out; the application retries immediately without backoff (cascading, fallacy 3); the gateway is hammered and goes down; now *all* payments fail. A system designed for network reality: every call has a timeout + circuit breaker, retry logic has exponential backoff, and payment validation is idempotent so retries are safe. The same glitch causes a brief 0.5% error rate; transactions backpressure the queue and recover within minutes.

## <span class="tpl">04</span>Common Mistakes

- **Ignoring timeouts.** Any remote call without a timeout is a time bomb.
- **Assuming one network.** You depend on your network, the cloud provider's network, the ISP, and the country's internet. All can fail independently.
- **Retrying immediately.** Turns a glitch into a cascade; exponential backoff + jitter is the answer.
- **No circuit breaker.** A dead dependency can hold your threads indefinitely; a breaker fails fast and releases capacity.
- **Assuming serialized data is transparent.** JSON is not self-describing; a client and server must agree on schema, and drift causes silent data corruption.

## <span class="tpl">05</span>Interview Perspective

The fallacies are the vocabulary of distributed systems thinking. A strong design answer addresses at least three of them explicitly: *"The network can be slow, so I have timeouts; it can be down, so I have a circuit breaker; and requests can be reordered, so I'm idempotent."* Interviewers listen for evidence that you design defensively, not optimistically.

## <span class="tpl">06</span>Code / Pseudocode

```python
# Every distributed call, designed against all eight fallacies

async def call_payment_api(charge_request, idempotency_key):
    # Fallacy 1 (unreliable): retries with backoff
    # Fallacy 2 (latency): timeouts
    # Fallacy 3 (infinite bandwidth): circuit breaker
    # Fallacy 5 (topology stable): target multiple endpoints
    # Fallacy 7 (zero transport cost): batch if possible
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # Fallacy 2: always timeout
            async with asyncio.timeout(1.0):
                # Fallacy 5: retry on different endpoint
                endpoint = ENDPOINTS[attempt % len(ENDPOINTS)]
                resp = await http_client.post(
                    f"{endpoint}/charges",
                    json=charge_request,
                    headers={"Idempotency-Key": idempotency_key},  # Fallacy 1: safe retry
                    timeout=httpx.Timeout(connect=0.5, read=0.5)
                )
                
                # Fallacy 4: always validate TLS
                assert resp.status_code != 400, "likely our bug"
                breaker.record(success=True)
                return resp.json()
        
        except (asyncio.TimeoutError, httpx.TimeoutException):  # Fallacy 2
            breaker.record(success=False)
            if breaker.is_open():
                raise ServiceDown("Circuit breaker open")
            await asyncio.sleep((2 ** attempt) * 0.1)  # Fallacy 1: exponential backoff
        
        except httpx.ConnectError:  # Fallacy 5: topology changes
            if attempt < max_retries - 1:
                await asyncio.sleep((2 ** attempt) * 0.1)
            else:
                raise
```

## <span class="tpl">07</span>Related Concepts

- **Error Handling & Resilience** — the practical toolkit for designing against fallacies.
- **Consistency Models** — fallacy 5 (unreliable networks) is why consistency is complex.
- **Microservices** — more networks = more fallacies; defense is essential.

**Source material:** Deutsch & Gosling's original "Fallacies of Distributed Computing" paper (still available online); the Google SRE book chapter on distributed systems for the practical consequences.

</div>

<div class="pane pane-build">

## Build Tasks — Fallacies of Distributed Computing

### Task 1 — Build a brittle service
Create a service that calls a dependency with no timeout, no retry, and no circuit breaker. Simulate the dependency being slow; watch the first service hang.
- **Done when:** you've reproduced one of the failures the fallacies predict.

### Task 2 — Fix it incrementally
Add timeouts. Measure. Add retries with backoff. Measure. Add a circuit breaker. Show that each layer reduces the blast radius.
- **Done when:** you have metrics showing improvement at each step.

### Task 3 — Cascade and cascade-breaker
Make the dependency slow. Send enough load to exhaust connection pools in the first service. Then add bulkheads (separate pools per dependency) and show isolation.
- **Done when:** one slow dependency no longer kills unrelated features.

</div>
