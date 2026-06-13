---
title: 'Sagas & Distributed Transactions'
description: 'Coordinating state changes across multiple services without two-phase commit: the saga patterns make long-running workflows correct.'
readingTime: 12
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

A single service has transactions: all-or-nothing atomicity. Across services, there is no atomic commit. A checkout (Order → Payment → Inventory) spans three services; if Payment fails after Order succeeds, who rolls back? The two-phase commit (2PC) is the classic answer, but it is synchronous, blocking, and breaks if a participant crashes.

Sagas are the alternative: a long-running workflow expressed as a series of compensating transactions. If a step fails, you execute the compensation (the inverse): cancel the order, refund the payment, unreserve inventory. The model is eventually consistent: the workflow will complete (forward or backward) but may take time.

Two styles:

- **Choreography** — services emit events; other services listen and react. Order publishes "OrderPlaced"; Payment subscribes and charges; if Payment fails, it publishes "PaymentFailed" and Order subscribes to compensate.
- **Orchestration** — a coordinator (a saga orchestrator service) tells each service what to do: "Order, create this; if success, Payment charge this; if success, Inventory reserve that." The orchestrator owns the workflow logic.

<div class="concept-card">
<div class="cc-label">Core principle</div>

A saga is not a transaction. It is a workflow that *will* eventually reach a consistent end state, but can experience partial failures, compensation, and retries. Design sagas to be idempotent and resumable.

</div>

## <span class="tpl">02</span>Mental Model

A catering company (the saga) coordinating a wedding. The order is placed; flowers are reserved, the kitchen is told to cook, the band is told to play. If the kitchen runs out of food, the flowers are returned and the band is told to cancel. The final state is consistent (either a full wedding or nothing), but intermediate states may not be (flowers reserved but kitchen down). The saga coordinator (the catering company) owns the workflow; each vendor (service) owns its domain.

## <span class="tpl">03</span>Real-World Example

**A checkout saga choreographed by events.** Customer places order; OrderService publishes "OrderCreated". PaymentService subscribes, charges the card, publishes "PaymentCollected". InventoryService subscribes, reserves stock, publishes "StockReserved". FulfillmentService subscribes and ships. If Payment fails, it publishes "PaymentFailed"; OrderService subscribes and cancels the order; InventoryService's listener for the cancel event unreserves. Each step is independent; if any service is temporarily down, the event sits in the queue and executes when the service recovers.

## <span class="tpl">04</span>Common Mistakes

- **Synchronous sagas.** Calling services in sequence and rolling back on failure is a saga in spirit but blocking in execution; use events instead.
- **Non-idempotent operations in a saga.** A saga step runs twice (due to retry); if "charge the card" is not idempotent, you double-charge. Every saga step must be idempotent (via idempotency keys).
- **No timeout on saga steps.** A step can hang forever, leaving the workflow incomplete. Every step needs a timeout and a compensation plan.
- **Losing track of saga state.** A saga runs asynchronously across services; losing the state (in-flight orders that never completed) is silent corruption. Persist saga state.

## <span class="tpl">05</span>Interview Perspective

Sagas are probed with "how do you handle failures across multiple services?" The strong answer proposes a saga (not 2PC), names the style (choreography via events is the modern default), and volunteers idempotency and timeouts. Mentioning that sagas are eventually consistent and may require compensations signals understanding. The question "what if a compensation fails?" is answered with retry logic and a dead-letter queue for manual intervention.

## <span class="tpl">06</span>Code / Pseudocode

```python
# Choreography-style saga: services publish events, others react and compensate.

# ORDER SERVICE
@router.post("/orders")
async def create_order(req):
    order = Order.create(req)
    await db.save(order)
    await events.publish(OrderPlaced(order.id, order.payment_needed))
    return order

async def handle_payment_failed(event: PaymentFailed):
    order = await db.get(event.order_id)
    order.status = "cancelled"
    await db.save(order)
    # Notify user; log for manual review
    await events.publish(OrderCancelled(event.order_id))

# PAYMENT SERVICE
async def handle_order_placed(event: OrderPlaced):
    # Idempotent: same request twice charges once
    receipt = await stripe.charge_async(event.order_id, event.amount, idempotency_key=event.order_id)
    if receipt.ok:
        await events.publish(PaymentCollected(event.order_id, receipt.id))
    else:
        await events.publish(PaymentFailed(event.order_id, receipt.reason))
```

## <span class="tpl">07</span>Related Concepts

- **Event-Driven Architecture** — choreography sagas use events.
- **Error Handling & Resilience** — timeouts and retries are saga essentials.
- **Consistency Models** — sagas are eventually consistent workflows.

**Source material:** Chris Richardson's Microservices Patterns book, ch. 7 on sagas; the "Saga" pattern in the Enterprise Integration Patterns book.

</div>

<div class="pane pane-build">

## Build Tasks — Sagas

### Task 1 — Choreography saga
Implement a three-step workflow (Order → Payment → Inventory) coordinated through events. Let Payment fail and verify Order compensates.
- **Done when:** a failed payment cancels the order and unreserves inventory.

### Task 2 — Idempotency in sagas
Replay a payment event twice; verify the charge happens exactly once (via idempotency key).
- **Done when:** repeated events are safe.

### Task 3 — Timeout and deadletter
Add a timeout to a saga step. If it doesn't complete in time, send to a dead-letter queue. Manually inspect and retry.
- **Done when:** stuck sagas surface for manual recovery.

</div>
