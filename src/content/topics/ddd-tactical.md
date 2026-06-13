---
title: 'Tactical DDD'
description: 'Inside a bounded context, patterns for expressing domain logic that stays consistent and expresses intent.'
readingTime: 11
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Tactical DDD is the pattern toolkit for a single bounded context — how to structure domain logic so that invariants (rules that must always be true) are enforced and intent is readable. The key patterns:

- **Entities** — objects with identity (an Order, a User). They change over time but remain "the same" Order even if every field changes. An entity is responsible for enforcing invariants on itself (an Order can't be shipped if not paid; this check lives in the entity, not in some service).
- **Value Objects** — immutable objects without identity (Money, Address, Duration). Two Money(10, USD) instances are equal if their amounts are equal; they have no ID. Easy to reason about because they never change.
- **Aggregates** — clusters of entities and value objects that form a boundary. An Order is an aggregate root; OrderLine and Discount are inside it. Only the root is accessed from outside; internal consistency is the aggregate's job.
- **Repositories** — the single way to retrieve an aggregate from storage. Not "get me all orders" (that's a query); "get the Order with this ID" (that's a retrieval).
- **Domain Events** — facts about what happened: "OrderPlaced", "PaymentReceived". Events are the only way an aggregate communicates outside itself; they replace methods like `order.notify_inventory()`.

<div class="concept-card">
<div class="cc-label">Core principle</div>

An aggregate is a transaction boundary. Everything inside commits together, or nothing does. If two aggregates must change together, they were probably one aggregate incorrectly split.

</div>

## <span class="tpl">02</span>Mental Model

An aggregate is a **ball of clay**. It has a boundary (the root entity); inside, pieces can change and move around; but from outside, you interact with the whole or not at all. If you're trying to split it in two, you're probably breaking an invariant — something inside the ball depends on something else inside the ball, and if they're separate, they can become inconsistent. The test: can a piece of logic live in two aggregates and not break? If so, it should live in exactly one, and the other should call the first through its repository.

## <span class="tpl">03</span>Real-World Example

**An Order aggregate.** It owns LineItems (no ID, internal only), enforces that the total price is always the sum of line items, and records a Discount value object (immutable). When the order is paid, the Order raises a "PaymentReceived" event; the Inventory context subscribes and reserves stock. The Order aggregate is a transaction capsule — add a line item, or none do. A bad design would have the Order reach out and call inventory directly; a good design, the Order raises an event, and the inventory service is responsible for listening and acting.

## <span class="tpl">04</span>Common Mistakes

- **Anemic aggregates.** The aggregate is just a data container; logic lives in a service. This defeats the purpose — invariants scatter and aren't enforced.
- **God aggregates.** One massive aggregate that owns half the domain; transactions become huge and consistency is hard to reason about.
- **Mutating value objects.** A Money object that mutates is no longer a value object; you've lost the "safe to share, safe to pass around" property.
- **Repositories that return query results instead of aggregates.** A repository should fetch aggregates, not arbitrary subsets of fields. If you need subsets, that's a query, not a retrieval.
- **No domain events.** Aggregates directly call services or repositories instead of raising events — tight coupling, hard to test, hard to compose.

## <span class="tpl">05</span>Interview Perspective

Tactical DDD is less commonly asked but signals sophistication. When it appears ("model the Order aggregate"), the strong answer identifies the root (Order), what lives inside (LineItems, totals logic), and what lives outside (Inventory, Payment — accessed through events, not calls). Mentioning value objects (immutable, interchangeable) and that invariants live in the aggregate itself (not in a service) shows you think about domain logic. The phrase that lands: *"An aggregate is a transaction boundary; if you're coordinating two aggregates in a service, one of them was probably misplaced."*

## <span class="tpl">06</span>Code / Pseudocode

```python
# Tactical DDD: aggregate, value object, and events.

from dataclasses import dataclass
from typing import List
from enum import Enum

# VALUE OBJECT — immutable, no identity
@dataclass(frozen=True)
class Money:
    amount_cents: int
    currency: str
    def add(self, other: "Money") -> "Money":
        assert self.currency == other.currency
        return Money(self.amount_cents + other.amount_cents, self.currency)

# ENTITY inside aggregate — has identity within aggregate
@dataclass
class LineItem:
    sku: str
    qty: int
    price: Money   # value object

# AGGREGATE ROOT — enforces invariants
class Order:
    def __init__(self, order_id: str, customer_id: str):
        self.order_id = order_id
        self.customer_id = customer_id
        self.items: List[LineItem] = []
        self.paid = False
        self.events: List[str] = []    # domain events

    def add_item(self, sku: str, qty: int, price: Money):
        self.items.append(LineItem(sku, qty, price))
        # Invariant: can't add items to a paid order
        if self.paid:
            raise ValueError("Cannot add items to a paid order")

    def pay(self):
        if self.paid:
            raise ValueError("Already paid")
        self.paid = True
        # Event, not a direct call to inventory
        self.events.append(f"PaymentReceived({self.order_id})")

    @property
    def total(self) -> Money:
        # Invariant: total is always the sum of items
        t = Money(0, "USD")
        for item in self.items:
            t = t.add(Money(item.price.amount_cents * item.qty, item.price.currency))
        return t
```

## <span class="tpl">07</span>Related Concepts

- **Strategic DDD** — context boundaries that make tactical patterns possible.
- **Event-Driven Architecture** — domain events as the communication mechanism.
- **Backend Architecture** — aggregate repositories are the application layer.
- **Data Modeling & Databases** — aggregates often map to transaction boundaries.

**Source material:** *Implementing Domain-Driven Design* (Vernon) ch. 4–10 on aggregates, entities, value objects, and repositories; *Domain Modeling Made Functional* (Wlaschin) for a more practical take.

</div>

<div class="pane pane-build">

## Build Tasks — Tactical DDD

### Task 1 — Design an aggregate
Take a complex feature (orders, accounts, documents). Identify the aggregate root, what entities and value objects live inside, and what invariants the aggregate enforces.
- **Done when:** you've written the aggregate class with invariant checks in methods, not in services.

### Task 2 — Move logic into the aggregate
Take a service that coordinates multiple steps on a domain object. Move the logic into the aggregate and have the service call the aggregate's method instead.
- **Done when:** the service is thin; the aggregate owns its own consistency.

### Task 3 — Emit domain events
Modify the aggregate to record events (e.g., "OrderPlaced", "PaymentCollected"). Have an application service publish them and another service subscribe.
- **Done when:** a domain event triggers side effects without the aggregate knowing about those side effects.

</div>
