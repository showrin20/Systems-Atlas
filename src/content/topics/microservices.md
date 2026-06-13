---
title: 'Microservices'
description: 'Breaking one service into many; the trade is operational complexity for organizational independence and scaled development velocity.'
readingTime: 13
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Microservices is the practice of decomposing a system into many independent services, each owning a bounded context, its database, and its API. The appeal is clear: teams can deploy independently, scale services separately, and choose technologies per domain. The cost is equally clear: you now operate N services instead of 1, have N databases to manage, and pay for inter-service communication in latency and complexity.

The decision framework is not "use microservices at scale." It is: **Does the monolith have a seam where you can split it without tight coupling?** If yes, and if different teams are fighting over the monolith's release schedule, split. If you have one team and one release schedule, a modular monolith (single deployment, many modules) is faster.

A microservice is not a service that is small; it is a service that owns a bounded context, can be deployed independently, and has its own data. Calling every HTTP endpoint a "microservice" is not architecture, it is a network call.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Microservices are an organizational tool, not a technical one. If your team structure doesn't match the service boundaries, the services will fight each other.

</div>

## <span class="tpl">02</span>Mental Model

A team is given a city to manage. Initially, it's one village: centralized planning, one road system, one power grid. As it grows, the team fragments. Orders of north villagers take precedence over west. The team splits into regions. Each region manages its roads and power independently, trades at markets, and collaborates on inter-regional roads. The overhead of coordination is gone; the cost is that roads between regions must be negotiated and sometimes congested. That is microservices.

## <span class="tpl">03</span>Real-World Example

**A monolith that grew too fast.** One codebase, 40 engineers, three weeks to deploy because of merge conflicts and coordination. Splitting along bounded contexts (Order, Payment, Inventory, Fulfillment) and teams: each team deploys independently in 1 day. The cost: latency between services, eventual consistency, operational overhead (monitoring, logging, circuit breakers across services). But velocity is faster because teams don't block each other. The seam (the service boundary) is the same as the DDD boundary, so services are modular and loosely coupled.

## <span class="tpl">04</span>Common Mistakes

- **Microservices without the organizational structure.** One team managing ten services is worse than that team with one monolith.
- **Premature splitting.** A monolith that is well-modular and has one team is faster than ten microservices with one team.
- **Tight coupling via shared data.** A service that reads/writes another service's database is not a microservice; it's a remote library.
- **Too many services.** The coordination cost grows with N. Most companies have an optimal N around 5–15 services for a squad-sized organization.
- **No API versioning.** Services change; consumers must be decoupled from breaking changes. Version APIs and support multiple versions.

## <span class="tpl">05</span>Interview Perspective

Microservices appears in design interviews as "should we split this into services?" The strong answer is conditional: "If teams are independent and need to move at different paces, yes. If one team owns it all, a modular monolith is faster." Mentioning the seam (where to split) and that services must own their data shows thinking. The antipattern to call out: "services that share a database are not microservices; they're a distributed monolith."

## <span class="tpl">06</span>Code / Pseudocode

Service boundary (DDD context) → microservice:

```python
# ORDER SERVICE — owns order data and logic
@router.post("/orders")
async def place_order(req: OrderRequest):
    order = Order.create(req.items, req.customer)
    await order_repo.save(order)
    # Publish, don't call: OrderService doesn't know about Payment
    await event_bus.publish(OrderPlaced(order.id, order.customer_id, order.total))
    return order

# PAYMENT SERVICE — independent, owns payment data
async def handle_order_placed(event: OrderPlaced):
    payment = Payment.charge(event.customer_id, event.total)
    await payment_repo.save(payment)
    # Back to Order via event, not a direct call
    await event_bus.publish(PaymentProcessed(event.order_id, payment.id))

# The boundary is the event — Order service doesn't know PaymentService exists.
```

## <span class="tpl">07</span>Related Concepts

- **Strategic DDD** — bounded contexts become service boundaries.
- **Event-Driven Architecture** — services communicate via events.
- **API Design** — service-to-service APIs are contracts under strict versioning.
- **Deployment & CI/CD** — each service has its own pipeline.

**Source material:** *Building Microservices* (Newman) for the architectural patterns; *Team Topologies* (Skelton & Pais) for the organizational alignment; the "Microservice Prerequisites" section of the Sam Newman book.

</div>

<div class="pane pane-build">

## Build Tasks — Microservices

### Task 1 — Identify a seam in your monolith
Look at a real project. Find a bounded context (strategic DDD) that could be independent. Propose service boundaries and a communication API.
- **Done when:** you have a diagram and a written API contract.

### Task 2 — Extract one service
Move the bounded context into a separate codebase and service. Have the original monolith call it via HTTP (with circuit breakers, timeouts, and error handling).
- **Done when:** the service deploys independently and the monolith works through the network API.

### Task 3 — Communication through events
Add event publishing to the extracted service. Have another service (the original or a new one) subscribe and react.
- **Done when:** services coordinate through events, not direct calls.

</div>
