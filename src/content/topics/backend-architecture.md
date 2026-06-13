---
title: 'Backend Architecture'
description: 'The internal shape of a service: layers, boundaries, and dependency direction. Good architecture makes the next change cheap.'
readingTime: 11
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Backend architecture is the answer to one question: **when a requirement changes, how many files do you touch, and how confident are you?** Layering, dependency direction, and module boundaries exist to keep that answer small and high. A service with good internals can swap Postgres for another store, add a gRPC interface beside REST, or change a business rule — each in one place.

The standard decomposition is three responsibilities that must not blur:

- **Transport / interface layer** — HTTP routes, request validation, serialization. Knows about the web; knows nothing about business rules.
- **Domain / service layer** — the business logic: pure functions and objects expressing what the system *does*. Knows nothing about HTTP or SQL.
- **Infrastructure layer** — repositories, external API clients, queues. Implements the *how* behind interfaces the domain defines.

The rule that makes it architecture instead of folders: **dependencies point inward.** Transport and infrastructure depend on the domain; the domain depends on nothing concrete. That's the dependency inversion principle applied at service scale, and it's what makes the domain testable without a database and portable across frameworks.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Frameworks, databases, and protocols are details that change every few years. Business rules change on their own schedule. Architecture is keeping the second category from being hostage to the first.

</div>

## <span class="tpl">02</span>Mental Model

Picture the service as a **city with a customs border**. The domain is the city center: its own language (domain models), its own laws (invariants), no foreign currency circulating (no ORM rows, no request objects). Everything entering from outside — an HTTP request, a DB row, a queue message — passes through customs at the border, where it's translated into domain language. Everything leaving is translated back. Routers and repositories are border crossings; the bug pattern they prevent is foreign objects (a SQLAlchemy row, a Pydantic request model) wandering deep into business logic and coupling everything to everything.

## <span class="tpl">03</span>Real-World Example

**A FastAPI service that grew up.** Version one: routes that parse the request, run SQL through the ORM, and compute business rules inline — fast to write, and every change risks everything. The refactor that production demands: routes become thin (`parse → call service → serialize`); a `services/` layer holds use cases (`place_order`, `cancel_order`) operating on plain domain objects; `repositories/` hide the ORM behind interfaces (`OrderRepository.get`, `.save`). The payoff arrives concretely: adding a Celery worker that also places orders reuses the same service function with zero HTTP involvement; unit tests inject a fake repository and run in milliseconds; and when the team later splits the service in two, the seam already exists. This is exactly the restructure pattern you've applied moving projects from prototype to PostgreSQL-backed production.

## <span class="tpl">04</span>Common Mistakes

- **Fat controllers** — business logic in route handlers means the only way to test rules is through HTTP, and the only way to reuse them is copy-paste.
- **Anemic services over smart ORMs** — pushing logic into ORM models/hooks couples rules to the persistence framework; the database session leaks everywhere.
- **Layering as ceremony** — five layers that each just forward the call add indirection without isolation. Layers earn their existence by *hiding* something.
- **Shared "utils" becoming a dumping ground** — a module everything imports becomes a coupling hub; change it and the whole codebase ripples.
- **Premature microservices** — distributing a system whose internal boundaries are still wrong turns method calls into network failures. Get the modular monolith right first; the seams become service borders later if needed.

## <span class="tpl">05</span>Interview Perspective

This surfaces in two forms. Design interviews: when asked to zoom into one service, sketch the three layers and say the dependency rule out loud — "domain depends on nothing; infrastructure implements its interfaces." Behavioral/code review interviews: expect "how would you refactor this handler" — the answer is extracting the use case into a service function and the SQL into a repository, then showing the unit test that's now possible. The phrase that lands: *"I optimize for cost of change, not elegance."*

## <span class="tpl">06</span>Code / Pseudocode

```python
# Dependency direction in 30 lines.

# domain/orders.py — pure; imports nothing from FastAPI or SQLAlchemy
class OrderRepository(Protocol):
    async def get(self, order_id: UUID) -> Order | None: ...
    async def save(self, order: Order) -> None: ...

async def cancel_order(repo: OrderRepository, order_id: UUID) -> Order:
    order = await repo.get(order_id)
    if order is None:
        raise OrderNotFound(order_id)
    order.cancel()                  # invariant lives on the domain object
    await repo.save(order)
    return order

# infrastructure/pg_orders.py — implements the port
class PgOrderRepository:
    ...  # SQLAlchemy details quarantined here

# api/routes.py — thin border crossing
@router.post("/orders/{order_id}/cancel")
async def cancel(order_id: UUID, repo: PgOrderRepository = Depends(get_repo)):
    return OrderOut.from_domain(await cancel_order(repo, order_id))
```

## <span class="tpl">07</span>Related Concepts

- **Modularity & Coupling** — the principles this architecture applies.
- **Hexagonal Architecture** — this idea formalized as ports and adapters.
- **Testing** — the dependency rule is what makes fast tests possible.
- **Microservices** — the same boundaries, paid for in network calls.

**Source material:** *Clean Architecture* (Martin) for the dependency rule — read critically, take the direction principle, skip the dogma; *Architecture Patterns with Python* (Percival & Gregory, free online) — the best hands-on treatment for exactly your stack.

</div>

<div class="pane pane-build">

## Build Tasks — Backend Architecture

### Task 1 — Strangle a fat handler
Take one real endpoint from a current project where logic lives in the route. Extract: domain function + repository protocol + thin route.
- **Done when:** the domain function has a unit test using a fake repo that runs with no DB and in <50ms.

### Task 2 — Prove the seam
Reuse the extracted use case from a second entry point (CLI command or Celery task) with zero duplication.
- **Done when:** both entry points call the identical function and an integration test covers each.

### Task 3 — Swap the detail
Add a second repository implementation (in-memory or SQLite) behind the same protocol and run the full domain test suite against both.
- **Done when:** the suite passes on both with no domain-code changes — that's the dependency rule, demonstrated.

</div>
