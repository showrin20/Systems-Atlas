---
title: 'API Design'
description: 'An API is a contract under load. Good design is deciding what you promise, to whom, and what happens when either side breaks the promise.'
readingTime: 14
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

An API is not "endpoints." It is a **contract between two systems that evolve at different speeds**. The provider will refactor, re-platform, and scale; consumers will cache responses, hardcode assumptions, and never upgrade. API design is the discipline of writing that contract so both sides can change without coordinating.

This reframing explains why API design matters more than almost any internal code decision: internal code is cheap to change, a published API is nearly impossible to change. Stripe still serves API versions from 2014. Every field you expose is a promise someone will build a business on.

In real systems, API design decisions show up as:

- **Blast radius of change** — a renamed field in an internal module breaks a compile; in a public API it breaks a customer in production.
- **Database protection** — pagination, filtering, and field selection are how you stop one consumer from issuing a query that takes down your primary.
- **Operational semantics** — idempotency, retries, and timeouts are part of the contract, not an afterthought. A payment API without idempotency keys is a double-charge generator.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Design the API for the **consumer's mental model**, implement it against the **provider's data model**, and never let the second leak into the first. The moment your API mirrors your tables, your schema is frozen forever.

</div>

## <span class="tpl">02</span>Mental Model

Think of an API as a **storefront, not a warehouse**. The warehouse (your database, your services) is organized for *your* efficiency: normalized tables, internal IDs, batch jobs. The storefront is organized for the *customer's* task: "I want to place an order," not "I want to insert into three tables."

The contract has three layers, and most design failures come from confusing them:

<div class="diagram">
<svg viewBox="0 0 640 230" xmlns="http://www.w3.org/2000/svg">
  <rect class="dg-box-hot" x="20" y="20" width="600" height="54"/>
  <text class="dg-text" x="36" y="42">SEMANTICS — what operations mean</text>
  <text class="dg-text-dim" x="36" y="60">resources, idempotency, error meaning, consistency promises (hardest to change)</text>
  <rect class="dg-box" x="20" y="90" width="600" height="54"/>
  <text class="dg-text" x="36" y="112">SHAPE — how data is represented</text>
  <text class="dg-text-dim" x="36" y="130">field names, types, nesting, pagination format (versionable)</text>
  <rect class="dg-box" x="20" y="160" width="600" height="54"/>
  <text class="dg-text" x="36" y="182">TRANSPORT — how bytes move</text>
  <text class="dg-text-dim" x="36" y="200">REST/JSON, gRPC, GraphQL, webhooks (most swappable)</text>
</svg>
<div class="caption">The three layers of an API contract. Teams argue about transport; consumers get burned by semantics.</div>
</div>

Most "REST vs GraphQL" debates happen at the transport layer — the least important one. The decisions that haunt you for a decade are semantic: *Is `POST /charges` retryable? Does `GET /orders/123` reflect the write I just made? What does a 409 mean here?*

<details class="deep-dive">
<summary>Deep dive: idempotency as a first-class semantic</summary>
<div class="dd-body">

Networks fail *after* the server processed a request but *before* the client saw the response. The client must retry; the server must not repeat the side effect. The standard solution is an **idempotency key**: the client generates a unique key per logical operation and sends it as a header; the server stores `key → response` and replays the stored response on retry.

Design consequences:

- Keys need a TTL and a storage decision (usually Redis or the same DB row, written in the same transaction as the side effect).
- A retry with the same key but a *different body* should be rejected (`422`), not silently replayed — otherwise bugs hide.
- This is why `PUT` is preferred over `POST` where the client can name the resource: `PUT /orders/{client-generated-id}` is naturally idempotent.

</div>
</details>

## <span class="tpl">03</span>Real-World Example

**Stripe's payments API** is the canonical case study because every hard problem appears in one place:

- **Idempotency keys on every POST.** A flaky mobile network must never double-charge a card. The key is stored with the first response; retries replay it byte-for-byte.
- **Date-pinned versioning** (`Stripe-Version: 2024-06-20`). Each account is pinned to the version it integrated against; breaking changes ship as new dates. The translation from current internal shape to old external shapes happens in a compatibility layer at the edge — the storefront/warehouse split made literal.
- **Cursor pagination everywhere** (`starting_after=obj_id`). Offset pagination (`?page=500`) forces the database to scan and discard 500 pages of rows, and skips/duplicates items when the underlying list mutates between requests. Cursors are stable under writes and O(1) for the database.
- **Expandable objects** (`expand[]=customer`). Responses return IDs by default; the consumer opts into joins. This caps the cost of the worst-case query the API can be made to run.

The pattern to internalize: every one of these features exists to protect one side of the contract from the other's behavior under failure or scale.

## <span class="tpl">04</span>Common Mistakes

- **Exposing the database schema.** Auto-generated CRUD over tables means every schema migration is now a breaking API change. The API should model *use cases*, not rows.
- **Designing only the happy path.** Error responses are part of the contract. If consumers can't distinguish "retry this" (`429`, `503`) from "fix your request" (`400`, `422`) from "this conflict is semantic" (`409`), they will retry non-retryable requests and page you at 3 a.m.
- **Returning unbounded collections.** `GET /users` with no pagination works in staging with 50 rows and takes down production with 5 million. Pagination is not a v2 feature.
- **Versioning in a panic.** If you have no versioning strategy on day one, your first breaking change becomes a customer-by-customer migration project. Additive changes (new optional fields) should always be safe; consumers must be told to ignore unknown fields.
- **Chatty resource granularity.** Forcing a mobile client to make 14 round trips to render one screen is a design failure of the resource model, not something to patch with a CDN.

## <span class="tpl">05</span>Interview Perspective

In system design interviews, API design is usually the **second step** ("define the API") and interviewers use it to test whether you think in contracts:

- Write 3–5 endpoints maximum, with verbs, paths, key request/response fields, and **status codes** — precision over coverage.
- Say the word **idempotency** when any write is involved, and explain the key mechanism in two sentences. This single move separates senior from mid-level answers.
- Mention pagination strategy for any list endpoint and *why cursors* (stability under mutation, O(1) cost).
- Tie the API to capacity: "this endpoint is the hot read path, it gets the cache; this one is write-heavy, it gets the queue."

A strong sample answer fragment: *"`POST /rides` accepts an `Idempotency-Key` header because mobile clients retry on timeout; the server stores the key with the created ride and replays the response, so a retry can never create two rides."*

## <span class="tpl">06</span>Code / Pseudocode

Idempotent creation, the way a payments-grade API does it:

```python
# FastAPI-style pseudocode — idempotent POST /charges
@app.post("/charges")
async def create_charge(req: ChargeRequest, idem_key: str = Header(...)):
    # 1. Atomically claim the key. The unique constraint is the lock.
    claimed = await db.execute(
        """INSERT INTO idempotency_keys (key, request_hash, status)
           VALUES ($1, $2, 'in_progress')
           ON CONFLICT (key) DO NOTHING""",
        idem_key, hash(req),
    )

    if not claimed:
        existing = await db.fetch_one(
            "SELECT request_hash, status, response FROM idempotency_keys WHERE key = $1",
            idem_key,
        )
        if existing.request_hash != hash(req):
            raise HTTPException(422, "Idempotency key reused with different payload")
        if existing.status == "in_progress":
            raise HTTPException(409, "Original request still processing, retry later")
        return JSONResponse(existing.response)   # replay, byte-for-byte

    # 2. Side effect + response stored in ONE transaction.
    async with db.transaction():
        charge = await charge_card(req)
        await db.execute(
            "UPDATE idempotency_keys SET status='done', response=$2 WHERE key=$1",
            idem_key, charge.to_json(),
        )
    return charge
```

The two load-bearing details: the **unique constraint acts as the distributed lock**, and the **response is persisted in the same transaction as the side effect** — if either is missing, a crash between steps re-opens the double-charge window.

## <span class="tpl">07</span>Related Concepts

- **Networking Fundamentals** — timeouts and connection failures are *why* idempotency exists.
- **Error Handling & Resilience** — retry policies are the consumer-side half of this contract.
- **Caching & Performance** — `Cache-Control`, `ETag`, and read-path design start at the API surface.
- **Authentication & Authorization** — every contract needs an identity model; scopes are API design.
- **Microservices** — service-to-service APIs are this topic with the failure rates multiplied.

</div>

<div class="pane pane-build">

## Build Tasks — API Design

Work in your normal stack (FastAPI + PostgreSQL is ideal here). Each task has a definition of done; don't move on until you can demonstrate it.

### Task 1 — Idempotent order creation

Build `POST /orders` with full idempotency-key support.

- **Done when:** firing the same request 50 times concurrently (`asyncio.gather` or `hey -n 50 -c 50`) creates exactly **one** row, and all 50 responses are byte-identical.
- **Stretch:** same key + different body returns `422`; key TTL expires after 24h.

### Task 2 — Cursor pagination under mutation

Implement `GET /orders?limit=20&starting_after=<id>` over a table with 100k seeded rows.

- **Done when:** you can walk all pages while a second script inserts and deletes rows mid-walk, with **no duplicates and no skips** in the items that existed for the whole walk. Then implement offset pagination and write down where it breaks — seeing the failure is the lesson.

### Task 3 — Error contract

Define one machine-readable error envelope (`type`, `code`, `message`, `retryable: bool`) and apply it to every failure path of Tasks 1–2.

- **Done when:** a generic client function `request_with_retry()` can decide retry/no-retry using **only** the envelope, never the message text.

### Task 4 — Break it, then version it

Rename a response field (`total` → `amount_total`) without breaking an existing consumer.

- **Done when:** old clients sending `API-Version: 2024-01-01` still receive `total`, new clients receive `amount_total`, and the translation lives in one middleware — not scattered through handlers.

</div>
