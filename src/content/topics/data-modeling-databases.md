---
title: 'Data Modeling & Databases'
description: 'Your schema outlives your code. Data modeling is deciding which questions will be cheap to answer for the next decade.'
readingTime: 13
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

A database does three jobs: **persist** data through crashes, **arbitrate** concurrent access (transactions), and **answer questions fast** (indexes, query planning). Data modeling is shaping your data so all three stay cheap as it grows — and the central tension is that the model that's easiest to write (normalized, no duplication, every fact in one place) is often not the model that's fastest to read (denormalized, pre-joined, duplicated).

The decisions that compound over years:

- **Normalization vs denormalization** — normalize until reads hurt, then duplicate deliberately and own the synchronization.
- **Indexing** — every index speeds one read pattern and taxes every write. An unindexed query on a big table is a full scan; the difference between 2ms and 20s is usually one `CREATE INDEX`.
- **Transactions & isolation** — `READ COMMITTED` vs `REPEATABLE READ` vs `SERIALIZABLE` is a dial between performance and how many concurrent anomalies you tolerate. Most engineers run the default without knowing which anomalies it permits.
- **Engine choice** — relational (Postgres) as the default; document, key-value, columnar, graph, and search engines as *specialized tools you add for a measured reason*, never as the starting point.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Model the **queries**, not the entities. List the top ten questions the system must answer and their frequencies; the schema and indexes fall out of that list. A beautiful ER diagram that can't answer the hot query cheaply is a wrong model.

</div>

## <span class="tpl">02</span>Mental Model

An index is the **card catalog in a library**: a small, sorted structure (almost always a B-tree) pointing at the big unsorted pile of rows. Looking up by an indexed column is a few tree hops — O(log n); without it, the librarian reads every book — O(n). A composite index `(user_id, created_at)` is a catalog sorted by user *then* date: perfect for "this user's recent orders," useless for "all orders on a date" (you can use the leftmost columns of a composite index, not the middle).

Transactions are the **airlock**: everything inside commits or vanishes together, and isolation levels set how much two open airlocks can see of each other. The write-ahead log (WAL) is the flight recorder that makes crash recovery possible — and, repurposed, it's also how replication and CDC (Debezium-style) work: replicas just replay the recorder.

## <span class="tpl">03</span>Real-World Example

**An orders system at e-commerce scale** shows every trade-off live. Core tables stay normalized (`orders`, `order_items`, `products`) because money demands one source of truth. But the order *list page* needs product names and thumbnails — joining at read time is fine until ~10M rows, after which teams denormalize: copy `product_name` into `order_items` at purchase time (it's actually *more* correct — the name at time of purchase shouldn't change retroactively). The hot path `WHERE user_id = ? ORDER BY created_at DESC LIMIT 20` gets the composite index. Analytics queries ("revenue by category by week") get evicted to a columnar replica/warehouse so they stop locking and scanning the OLTP primary. Full-text product search goes to a search engine fed by CDC. One logical dataset, four physical shapes — each shaped by its query pattern.

## <span class="tpl">04</span>Common Mistakes

- **Indexing reactively, in production, during the incident.** Find missing indexes with `EXPLAIN ANALYZE` in development; "Seq Scan" on a large table in a hot path is a bug.
- **N+1 queries.** One query for the list, then one per item — the ORM's favorite trap. 1+100 round trips instead of 2. Fix with joins/`selectinload`; detect by logging query counts per request.
- **Premature NoSQL.** Choosing a document store "for scale" before having scale buys you eventual consistency and no joins for a dataset that fits in Postgres with room for 100×.
- **Ignoring isolation anomalies.** Two transactions reading a balance and both updating it can both succeed at `READ COMMITTED` — the lost update from the concurrency topic, now wearing a SQL costume.
- **No migration discipline.** Schema changes without a tool (Alembic) and without backward-compatible steps (add column → backfill → switch reads → drop old) turn deploys into outages.

## <span class="tpl">05</span>Interview Perspective

Every system design interview has a "how do you store it" act. The expected moves: propose a schema in 4–6 tables, *immediately* name the indexes for the access patterns you listed, state read/write ratio, and address growth — read replicas first, then caching, then sharding *last* with the shard key justified ("shard by user_id so a user's data is one shard; cross-user queries go to the warehouse"). For SQL-vs-NoSQL questions, the senior answer is criteria, not allegiance: transactions and ad-hoc queries → relational; known access paths at extreme scale → key-value/document; analytics → columnar.

## <span class="tpl">06</span>Code / Pseudocode

```sql
-- The hot query, and the index that makes it O(log n):
-- "latest 20 orders for a user"
CREATE INDEX idx_orders_user_recent ON orders (user_id, created_at DESC);

EXPLAIN ANALYZE
SELECT id, status, total_amount, created_at
FROM orders
WHERE user_id = 4231
ORDER BY created_at DESC
LIMIT 20;
-- Good plan: Index Scan using idx_orders_user_recent  (cost≈8 rows=20)
-- Bad plan:  Seq Scan on orders + Sort  ← the same query, 1000× slower

-- Lost-update-proof balance change: the DB serializes it.
UPDATE accounts SET balance = balance - 250
WHERE id = $1 AND balance >= 250;
-- rowcount 0 = insufficient funds; no read-modify-write race possible
```

## <span class="tpl">07</span>Related Concepts

- **Caching & Performance** — what you bolt on *after* the indexes are right.
- **Concurrency & Async Processing** — isolation levels are the database's concurrency control.
- **Consistency Models** — replication stretches "the database" across machines and weakens its promises.
- **Tactical DDD** — aggregates put domain boundaries around transactional ones.

**Source material:** *Designing Data-Intensive Applications* (Kleppmann) ch. 1–3 and 7 — the single most important book for this entire curriculum; *SQL Performance Explained* (Winand, use-the-index-luke.com) for index intuition; PostgreSQL docs on `EXPLAIN`.

</div>

<div class="pane pane-build">

## Build Tasks — Data Modeling & Databases

### Task 1 — EXPLAIN everything
Seed 5M orders. Run the "user's recent orders" query without indexes, read the plan, add the composite index, re-read.
- **Done when:** you have before/after plans and timings, and can explain why `(created_at, user_id)` (reversed) would *not* work.

### Task 2 — Reproduce N+1, then kill it
Build an endpoint listing 50 orders with product names via an ORM, log every SQL statement, count them. Fix with a join/eager load.
- **Done when:** query count drops from 51 to ≤2 and p99 improves measurably.

### Task 3 — Isolation anomalies live
Open two psql sessions. At `READ COMMITTED`, produce a lost update on a balance. Retry at `REPEATABLE READ` and at `SERIALIZABLE`; record what each level does (silent loss / serialization error).
- **Done when:** you've seen the error 40001 and your code retries it correctly.

### Task 4 — Zero-downtime migration
Rename a heavily-read column using the expand-and-contract pattern (add new → dual-write → backfill → switch reads → drop old) with Alembic, while a load test runs.
- **Done when:** the load test shows zero errors through all five steps.

</div>
