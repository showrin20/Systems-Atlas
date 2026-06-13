---
title: 'CQRS'
description: 'Command-Query Responsibility Segregation: separate write and read models when they have different scaling, consistency, or latency needs.'
readingTime: 11
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

CQRS (Command-Query Responsibility Segregation) is the idea that **writes and reads are different problems and might need different solutions**. A command (POST /order, an insert, a write) changes state; a query (GET /orders?filter=status:pending, a read) retrieves state. They often have opposite requirements: writes need transactional consistency; reads need speed and flexibility. CQRS separates them explicitly — one model optimized for writes, one for reads.

The pattern is not always necessary. A single normalized schema serving both works fine for small systems. CQRS is the answer to *"queries are slow even though we've indexed everything, or consistency is hard to achieve with fast reads, or we need multiple views on the same data."* Not *"let's use CQRS because it sounds cool."*

The implementation is usually event-sourcing or CDC (Change Data Capture): when a write happens, it's recorded, and a separate process projects that write into a read model (a denormalized table, a search index, a cache). Reads hit the projection; writes update the source.

<div class="concept-card">
<div class="cc-label">Core principle</div>

CQRS is not about two databases. It is about two models serving different purposes. The read model is always eventually consistent and can be rebuilt from the write model's source of truth.

</div>

## <span class="tpl">02</span>Mental Model

A library's **catalog vs. inventory system**. The inventory system (write model) is the source of truth: books physically on shelves, exact counts, transactions to move them. The catalog (read model) is what users search: title, author, availability hint, recommendations. The catalog is fast and denormalized because it's read-heavy; the inventory is normalized and consistent because writes must be atomic. When a book is checked in, the inventory updates; an async process updates the catalog. A catalog search is never perfectly fresh — but 60 seconds of staleness is acceptable for "is this book available?"

## <span class="tpl">03</span>Real-World Example

**An e-commerce product catalog.** The write model: one normalized table with every product field, indexed by SKU. Creating a new product or updating inventory is a single write. But the read model (the catalog) needs: title + price + images for every product, plus recommendations, search keywords, reviews — data from a dozen tables. A single JOIN on every catalog search is too slow. CQRS: a CDC pipeline watches the write table; whenever a product changes, it updates a denormalized read table and also updates the search index and refreshes the recommendation cache. Catalog reads are fast and fresh; writes are cheap and consistent.

## <span class="tpl">04</span>Common Mistakes

- **Premature CQRS.** Adding it before you've measured: indexed queries, a read replica, or caching solves the problem 99% of the time. Measure first.
- **Inconsistent read models.** If projections get out of sync and don't recover, you have two sources of truth, which is a consistency nightmare. The read model must be rebuildable from the write model.
- **Ignoring the projection lag.** Reads are eventually consistent; if that's unacceptable (user submits an order and immediately checks its status), you need short lag or a short-circuit to the write model.
- **One read model for all queries.** If you have 20 different queries with different access patterns, 20 read models are fine — each optimized for its query. Resist the temptation to make one "universal" read model.

## <span class="tpl">05</span>Interview Perspective

CQRS appears in high-scale design interviews. The strong answer recognizes when to apply it: "Reads and writes have opposite scaling profiles; products are read-heavy, writes are occasional — a single schema with indexes handles it. But if recommendations require compute that makes write throughput painful, I'd add a read-only recommendation model." Mentioning eventual consistency and that the read model is rebuilt from writes shows understanding. The mistake to avoid: proposing CQRS as the baseline solution instead of as a tool for specific problems.

## <span class="tpl">06</span>Code / Pseudocode

```python
# CQRS: write model (source of truth) and read model (projection).

# WRITE MODEL — single source of truth, normalized
class ProductService:
    async def update_price(self, sku: str, price_cents: int):
        # Atomic write: one table, one transaction
        await db.execute(
            "UPDATE products SET price_cents = $1, updated_at = now() WHERE sku = $2",
            price_cents, sku
        )
        # Publish an event for the projection
        await events.publish(f"ProductPriceChanged({sku}, {price_cents})")

# PROJECTION — reads from write model's events, maintains read model
class ProductCatalogProjection:
    async def handle_price_changed(self, event: ProductPriceChanged):
        # This runs asynchronously; catalog is eventually consistent
        product = await read_db.fetch_one(
            "SELECT * FROM products WHERE sku = $1", event.sku
        )
        # Denormalized read table: include related data for fast reads
        await catalog_db.execute(
            """UPDATE product_catalog
               SET price_cents = $1, recommendations = $2
               WHERE sku = $3""",
            event.price_cents, await compute_recommendations(event.sku), event.sku
        )

# QUERY — fast read from denormalized model
async def search_products(query: str):
    # Reads are instant, denormalized, no JOINs
    return await catalog_db.fetch(
        "SELECT id, title, price_cents, recommendations FROM product_catalog WHERE title ILIKE $1",
        f"%{query}%"
    )
```

## <span class="tpl">07</span>Related Concepts

- **Event-Driven Architecture** — events drive the projection.
- **Caching & Performance** — a read model is sometimes just a sophisticated cache.
- **Consistency Models** — read models are eventually consistent.

**Source material:** Greg Young's CQRS papers (the original definition); *Patterns of Enterprise Application Architecture* (Fowler) on read models and materialized views.

</div>

<div class="pane pane-build">

## Build Tasks — CQRS

### Task 1 — Measure before CQRS
Run a complex query (multiple JOINs) on production-scale data. Time it, index it, then run it again. If optimization gets you under your latency SLA, CQRS is not needed.
- **Done when:** you have before/after measurements and understand where the threshold was.

### Task 2 — Add a read model
Denormalize one complex query into a materialized view or a separate table. Keep it in sync with an async update or a CDC pipeline.
- **Done when:** read performance improves measurably and the read model stays consistent with source data.

### Task 3 — Project from events
Set up a service that subscribes to events, projects them into a read model, and queries run against the projection instead of the source.
- **Done when:** writes go to one table, reads go to the projection, and they stay in sync.

</div>
