---
title: 'Strategic DDD'
description: 'A business is not one model. It is many overlapping models, each with its own language. Strategy is drawing those boundaries.'
readingTime: 12
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Domain-Driven Design (DDD) is the discipline of making business logic the primary concern of architecture, not an afterthought bolted onto a database schema. **Strategic DDD** is the high-level part: identifying the domains your business actually operates in, the language each domain uses, and the boundaries between them — so that a change to one domain doesn't shatter the others.

The core concepts:

- **Bounded Context** — a linguistic and organizational boundary where one **ubiquitous language** (terms that mean the same thing to everyone in that context) is spoken. In a checkout context, "cart" is a shopping cart. In a warehouse context, "cart" is a physical handcart. Same word, different meanings — if you share a database with shared schemas, the distinction collapses into chaos.
- **Context Map** — documents how contexts relate: one feeds another, they translate between each other, one is subordinate to another.
- **Ubiquitous Language** — the shared vocabulary of the context's business domain, used in conversations, tests, code, and documentation. "Place order" is the language; "execute INSERT into orders" is not — that's database, not business.

The strategic win is that each context can have its own architecture, schema, and team — because the boundary is explicit and the API between contexts is negotiated, not accidentally leaked.

<div class="concept-card">
<div class="cc-label">Core principle</div>

The natural boundaries of a system are the boundaries of the business. Organize around how the business thinks, not around what happens to be easier to code.

</div>

## <span class="tpl">02</span>Mental Model

A business is a **landscape with regions**. Each region (bounded context) has its own dialect, local laws, and geography. The Order context and the Inventory context are neighbors; they trade goods at a border (the order-placement API), but neither speaks the other's language at home. A shared database is like erasing the borders and forcing everyone to speak a single language — possible, but everything becomes a translation problem.

## <span class="tpl">03</span>Real-World Example

**An e-commerce system with poor strategic DDD.** There's one "Order" model shared by the ordering system, the payment system, the inventory system, and the shipping system. Ordering wants to capture all possible order metadata; payment only cares about amount and customer; inventory only cares about SKU and quantity; shipping only cares about address. The shared table has 47 columns, and every system touches columns meant for others. A payment refund requires coordinating with three other systems because the model is entangled. After proper bounded contexts: Order context owns the order model (with its business language); other contexts subscribe to events ("OrderPlaced" or "PaymentCollected") and maintain their own models shaped to their needs. A refund is an event in the Payment context; the Order context learns about it and updates its state, but the models are decoupled.

## <span class="tpl">04</span>Common Mistakes

- **One model for the whole business.** Shared schemas that blur context boundaries until no one can change anything without breaking everything.
- **Boundaries drawn by technology, not business.** "We have a backend team and a frontend team" is not a domain boundary.
- **Skipping the ubiquitous language work.** Teams use different terms for the same thing; code becomes a translation dictionary, not business logic.
- **Too many contexts.** Micro-segmentation creates too many translation points and becomes a coordination problem. DDD is not an excuse for microservices per table.
- **Not documenting the context map.** Boundaries are meaningless if nobody knows them — draw them, write them down, enforce them.

## <span class="tpl">05</span>Interview Perspective

Strategic DDD appears in design interviews as "identify the bounded contexts." The strong answer names a few (Order, Payment, Inventory, Shipping), explains what language each speaks (Order talks about fulfillment, Payment talks about money), and proposes boundaries that let each evolve independently. Mentioning the context map (how they relate) and the ubiquitous language (naming things as the business does, not as the DB does) signals that you understand the goal: organizational alignment, not just technical elegance.

## <span class="tpl">06</span>Code / Pseudocode

```python
# Strategic DDD in miniature: separate models per context.

# orders/domain.py — Order context speaks business language
class Order:
    """An Order from the business perspective."""
    def __init__(self, customer_id, items):
        self.customer_id = customer_id
        self.items = items                   # items are (sku, qty)
        self.status = "pending"

# payments/domain.py — Payment context has its own model
class Payment:
    """A Payment has no concept of 'Order', only 'amount' and 'customer'."""
    def __init__(self, customer_id, amount_cents):
        self.customer_id = customer_id
        self.amount_cents = amount_cents
        self.status = "pending"

# The contexts communicate via events, not shared models.
# OrderPlaced event → Payment context subscribes and creates a Payment
# PaymentCollected event → Order context subscribes and marks fulfilled
```

## <span class="tpl">07</span>Related Concepts

- **Backend Architecture** — the architectural expression of bounded contexts.
- **Event-Driven Architecture** — the communication pattern between contexts.
- **Microservices** — bounded contexts as the unit of service decomposition.

**Source material:** *Domain-Driven Design* (Evans) ch. 1–4, 14 on strategic design and ubiquitous language; *Implementing Domain-Driven Design* (Vernon) on strategic patterns in practice.

</div>

<div class="pane pane-build">

## Build Tasks — Strategic DDD

### Task 1 — Identify bounded contexts
Take a real project. Draw the major business domains and propose context boundaries.
- **Done when:** you have a written context map showing at least 3 contexts and how they relate.

### Task 2 — Extract ubiquitous language
For one context, list the terms the business uses and the terms your code uses. Rename code to match the business language.
- **Done when:** a non-engineer reading the code can see the business logic without translation.

### Task 3 — Separate models across contexts
Pick two contexts. Create separate domain models for each, and define an API/event that lets them communicate without sharing a model.
- **Done when:** changing one context's model doesn't require changing the other's.

</div>
