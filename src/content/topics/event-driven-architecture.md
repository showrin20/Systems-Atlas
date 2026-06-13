---
title: 'Event-Driven Architecture'
description: 'Events are facts. Publish them, let systems act independently on them, and you have decoupling, auditability, and the foundation for scaling.'
readingTime: 13
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Event-driven architecture inverts the control flow. Instead of A calling B synchronously ("do this thing for me, wait for the answer"), A publishes an event ("this thing happened") and any number of subscribers can react, asynchronously, independently. The decoupling is profound: A doesn't know or care who's listening; B doesn't care who triggered the event.

The toolkit:

- **Event** — an immutable fact: "OrderPlaced", "PaymentCollected", "InventoryReserved". The past tense is semantic; events are what happened.
- **Publisher** — the system that owned the state change (Order service publishes OrderPlaced).
- **Event broker** — the transport (Kafka, RabbitMQ, AWS SQS/SNS, Pub/Sub). Responsible for delivery, ordering, partitioning.
- **Subscriber** — systems that care about an event and react. Each subscriber is independent; no subscriber knows about the others.
- **Event sourcing** — storing the log of events as the source of truth instead of the current state. Derived state (the current order status) is computed by replaying events.

<div class="concept-card">
<div class="cc-label">Core principle</div>

An event is owned by the service that published it. A service should never reinterpret another service's event; if you need different semantics, publish your own event. Shared events are coupling.

</div>

## <span class="tpl">02</span>Mental Model

A town square with a crier. The crier (publisher) announces news (events); townspeople (subscribers) listen and act. A announcement about a shipment arriving makes the warehouse prepare and the bookkeeper record it. The crier doesn't coordinate; listeners independently decide if the news matters to them. A town where everyone must ask the crier permission to act is synchronous and brittle; a town where the crier just announces is event-driven and scalable.

## <span class="tpl">03</span>Real-World Example

**A checkout system with event-driven communication.** Order service publishes "OrderPlaced" when a customer submits. Independently, three systems subscribe: Inventory reserves stock, Payment processes the charge, and Fulfillment ships the order. If Fulfillment is slow or down, it doesn't block Payment; it just falls behind on the queue and catches up when ready. If a new requirement arrives (notify the customer), add a new subscriber — the Order service code doesn't change. The audit log is the event log itself: every state change is a published event, so you can replay the order's history by replaying its events.

## <span class="tpl">04</span>Common Mistakes

- **Synchronous request-response disguised as events.** "EventPublished" that expects a 200 response before continuing defeats the purpose.
- **No schema for events.** Events change; old subscribers get new events with unexpected fields. Version events explicitly; make old subscribers tolerate new fields.
- **Tight coupling through shared events.** Multiple services interpreting the same event in different ways; when one interprets it slightly differently, all break.
- **Forgetting about delivery guarantees.** A message broker may deliver at-least-once (duplicates), and subscribers must be idempotent.
- **Event sourcing without an archival strategy.** The log grows forever; querying it becomes slow. Snapshots and archival are necessary operational details.

## <span class="tpl">05</span>Interview Perspective

Event-driven architecture appears in high-scale design interviews. The strong answer proposes events for inter-service communication, names the broker (Kafka for event log, SQS for task queues), and volunteers idempotency ("subscribers must be idempotent because delivery is at-least-once"). Mentioning event versioning and that events are immutable facts signals depth. The distinction between event sourcing (events as source of truth) and event-driven (events as communication) is a differentiator — many junior engineers conflate them.

## <span class="tpl">06</span>Code / Pseudocode

```python
# Event-driven: Order publishes, others subscribe independently.

# orders/events.py — facts owned by the Order service
from dataclasses import dataclass
from datetime import datetime

@dataclass
class OrderPlaced:
    order_id: str
    customer_id: str
    total_cents: int
    items: list
    timestamp: datetime
    version: int = 1  # schema versioning

# orders/service.py — publishes events
class OrderService:
    def __init__(self, repo, broker):
        self.repo = repo
        self.broker = broker
    
    async def place_order(self, customer_id, items):
        order = Order(customer_id, items)
        await self.repo.save(order)
        
        # Publish — doesn't wait for subscribers, doesn't know who they are
        event = OrderPlaced(
            order_id=order.id,
            customer_id=order.customer_id,
            total_cents=order.total_cents,
            items=order.items,
            timestamp=datetime.now(),
        )
        await self.broker.publish("orders", event)
        return order

# inventory/subscriber.py — independent subscriber
class InventorySubscriber:
    def __init__(self, inventory_repo, broker):
        self.inventory_repo = inventory_repo
        self.broker = broker
    
    async def start(self):
        # Listen to OrderPlaced, independently
        async for event in self.broker.subscribe("orders", "OrderPlaced"):
            await self.handle_order_placed(event)
    
    async def handle_order_placed(self, event: OrderPlaced):
        # Idempotent: if this runs twice, it's safe
        for item in event.items:
            await self.inventory_repo.reserve(item.sku, item.qty, event.order_id)
```

## <span class="tpl">07</span>Related Concepts

- **Strategic DDD** — bounded contexts communicate via events.
- **Sagas & Distributed Transactions** — events orchestrate long-running workflows.
- **Concurrency & Async Processing** — queues as backpressure buffers.
- **Observability** — tracing events across services requires correlation IDs.

**Source material:** *Designing Data-Intensive Applications* (Kleppmann) ch. 11 on event streams; *Building Event-Driven Microservices* (Narkhede) for the architecture and patterns; the Kafka and event sourcing papers.

</div>

<div class="pane pane-build">

## Build Tasks — Event-Driven Architecture

### Task 1 — Publish and subscribe
Build two services: one publishes a domain event (e.g., "OrderPlaced") to a message broker (Kafka, RabbitMQ, or in-process); the other subscribes and reacts.
- **Done when:** the subscriber receives and processes the event independently.

### Task 2 — Idempotent subscribers
Have the subscriber process the same event twice (replay it manually). Verify the side effect happens exactly once (insert once, not twice).
- **Done when:** replaying an event is safe; idempotency is proven.

### Task 3 — Event versioning
Change the event schema (add a field). Make the old subscriber tolerate it (ignore unknown fields).
- **Done when:** old code processes new events and new code processes old events without crashing.

### Task 4 — Event sourcing (capstone)
Store the event log as the source of truth. Compute current order state by replaying its events. Verify replaying all events gives the current state.
- **Done when:** the event log is auditable; state is derived by replay.

</div>
