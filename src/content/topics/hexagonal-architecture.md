---
title: 'Hexagonal Architecture'
description: 'Ports and adapters: isolate your domain from the outside world so it survives any framework, database, or protocol change.'
readingTime: 10
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Hexagonal architecture (also called ports and adapters, or onion architecture) is a formalization of the dependency-inversion principle at service scale. The idea: the domain (business logic) sits in the center, depending on nothing. Around it are **ports** — interfaces the domain defines for things it needs (a repository, a queue, a clock). Outside are **adapters** — implementations of those ports (Postgres, Redis, system time). The traffic pattern is **inbound** (a request comes in through an HTTP adapter, calling a domain use case) and **outbound** (the use case calls a port, an adapter executes).

The architecture is called hexagonal because the domain is surrounded in all directions; requests can enter from any direction (HTTP, CLI, message queue) without the domain changing. The domain is *not* a library inside a framework; it is the center, and frameworks are optional outer layers.

<div class="concept-card">
<div class="cc-label">Core principle</div>

The domain is portable. It should be possible to test it without a web framework, a database, or any I/O. If the domain imports from a framework or a database library, the architecture has failed.

</div>

## <span class="tpl">02</span>Mental Model

The domain is the **city center**. It has no idea there's a highway (HTTP) or a port (message queue) — those are external concerns. Inside the center, businesses operate on their own logic. The city publishes a list of services it offers (ports); companies outside use those services and operate independently. If you change the highway or add a new port, the city's economy is unaffected.

## <span class="tpl">03</span>Real-World Example

**A checkout service with hexagonal architecture.** The domain `PlaceOrderUseCase` depends on a `PaymentProcessor` port (interface) and an `OrderRepository` port. The HTTP adapter creates a PlaceOrderUseCase, passing a StripePaymentProcessor and PgOrderRepository. Tests inject a FakePaymentProcessor and InMemoryOrderRepository. A CLI command uses the same use case with a different entry point. The domain is untouched; the hexagon's outer surface has adapters for HTTP, CLI, message queues, cronjobs — any entry point is just another adapter.

## <span class="tpl">04</span>Common Mistakes

- **The domain imports from frameworks.** Once you `import fastapi` or `import sqlalchemy` into domain code, the architecture collapses.
- **Leaky ports.** A port that exposes implementation details (must throw a specific exception, must return a specific type) couples the domain to adapters.
- **Skipping the inbound adapter test.** The domain is tested, the adapters are tested in isolation, but no one tests the HTTP layer. Integration tests that drive the real HTTP interface are essential.
- **Treating the adapter as trivial.** An adapter is not a one-liner; it handles translation, error mapping, async boundaries, and validation.

## <span class="tpl">05</span>Interview Perspective

Hexagonal architecture is less commonly asked but signals depth. When it appears, the strong answer identifies the domain (pure logic), the ports (interfaces), and the adapters (implementations). Mentioning testability without a database is a signal — "I can test the use case with a fake repository in milliseconds" shows you understand the benefit. The key phrase: *"The domain is portable; if you can't test it without the framework, the architecture is wrong."*

## <span class="tpl">06</span>Code / Pseudocode

```python
# PORTS — the domain's interface to the outside world
from typing import Protocol

class PaymentProcessor(Protocol):
    async def charge(self, amount: Money, customer_id: str) -> str: ...

class OrderRepository(Protocol):
    async def save(self, order: Order) -> None: ...
    async def get(self, order_id: str) -> Order | None: ...

# DOMAIN — central, pure, no imports from frameworks or libs
class PlaceOrderUseCase:
    def __init__(self, payment: PaymentProcessor, repo: OrderRepository):
        self.payment = payment
        self.repo = repo
    
    async def execute(self, customer_id: str, items: list) -> Order:
        order = Order(customer_id, items)
        # Domain logic: order must have items, calculate total
        if not order.items:
            raise ValueError("Order must have items")
        
        # Call ports (not concrete implementations)
        receipt = await self.payment.charge(order.total, customer_id)
        order.mark_paid(receipt)
        await self.repo.save(order)
        return order

# ADAPTERS — translate between domain and outside world
class StripePaymentProcessor:
    async def charge(self, amount: Money, customer_id: str) -> str:
        resp = await stripe.charge_async(amount.cents, customer_id)
        return resp.id

class PgOrderRepository:
    def __init__(self, session):
        self.session = session
    async def save(self, order: Order) -> None:
        row = OrderRow.from_domain(order)  # translate
        await self.session.execute(INSERT, row)

# INBOUND ADAPTER — HTTP entry point
@router.post("/orders")
async def place_order_http(req: OrderRequest, deps = Depends()):
    use_case = PlaceOrderUseCase(deps.stripe_proc, deps.order_repo)
    result = await use_case.execute(req.customer_id, req.items)
    return OrderResponse.from_domain(result)
```

## <span class="tpl">07</span>Related Concepts

- **Backend Architecture** — the practical foundation for hexagonal organization.
- **Modularity & Coupling** — hexagonal architecture is maximally decoupled.
- **Testing** — testability without I/O is the architecture's main virtue.

**Source material:** Alistair Cockburn's original *Hexagonal Architecture* article; *Architecture Patterns with Python* (Percival & Gregory) applies it end-to-end to a real project.

</div>

<div class="pane pane-build">

## Build Tasks — Hexagonal Architecture

### Task 1 — Extract ports
Take one service with domain logic that currently imports a database client. Define Protocol interfaces for what the domain actually needs. Keep the domain unchanged; have adapters implement the protocols.
- **Done when:** the domain has zero framework or database imports.

### Task 2 — Test without I/O
Write unit tests for the use case (domain logic) using fake implementations of the protocols.
- **Done when:** a complex use case test runs in <100ms with no database.

### Task 3 — Swap adapters
Provide two implementations of a port (e.g., Postgres and SQLite, or real and fake payment processor). Verify the domain works with both.
- **Done when:** the same use case test passes with two different adapters.

</div>
