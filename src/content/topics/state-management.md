---
title: 'State Management'
description: 'State is anything the system must remember. Deciding where it lives, who owns it, and how it is allowed to change is half of architecture.'
readingTime: 10
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Every system is state plus the rules for changing it. The architectural question is never "do we have state" — it's **where does each piece live, who is allowed to mutate it, and what survives a crash?** Classifying state by its lifetime and value answers most design questions automatically:

- **Durable state** (orders, users, balances) — must survive anything; lives in the database; the source of truth.
- **Derived state** (caches, search indexes, materialized views, read models) — recomputable from durable state; allowed to be stale; allowed to be lost.
- **Session/ephemeral state** (logins, carts, rate-limit counters) — valuable but bounded lifetime; Redis territory.
- **In-flight state** (a request's local variables, a job mid-execution) — lives in process memory; lost on crash by design, which is why work is made restartable.

The defining decision of modern backends: **application instances hold no durable state.** A "stateless service" still computes with state constantly — it just rents it from stateful infrastructure per request. That single property is what makes horizontal scaling, rolling deploys, and instance death boring.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Every piece of state needs exactly one owner — one component with the right to mutate it. Two writers to the same state is where consistency bugs are born; everything downstream should hold copies it knows are copies.

</div>

## <span class="tpl">02</span>Mental Model

Think of state like **money in a household**. Durable state is the bank account — the authoritative balance, protected, audited. Caches are the cash in your wallet — convenient, fast, and if you lose it, annoying but recoverable from the bank. Session state is the parking meter ticket — real value, short life. The classic failure is treating wallet cash as the bank balance: building features on a cache (or on process memory) as if it were the source of truth, then losing it in a restart.

Sticky sessions — pinning a user to one server because that server's memory holds their session — is hiding money under one specific mattress: it works until that mattress catches fire, and it prevents you from adding mattresses.

## <span class="tpl">03</span>Real-World Example

**A login session, traced through a real deployment.** The user authenticates; the service writes a session record to Redis (`session:{token}` with TTL) and returns the token in a cookie. Every subsequent request, *any* of the 12 app pods can validate the token against Redis — no pod remembers anything, so Kubernetes can kill and reschedule pods mid-session invisibly, and a deploy is just a rolling replacement. Contrast the legacy version: sessions in process memory, load balancer configured for sticky sessions, every deploy logs everyone out, and scaling down loses live carts. Same feature, opposite operability — the only difference is where one piece of state lives. The same logic drove your own migrations from SQLite/localStorage to PostgreSQL-as-source-of-truth: promotion of state from convenient locations to owned, durable ones.

## <span class="tpl">04</span>Common Mistakes

- **Process memory as a database.** Module-level dicts holding user data work with one worker in dev and silently shard themselves across N workers in prod — each worker sees different state.
- **Two sources of truth.** The same fact writable in two stores (DB and cache, DB and another service's DB) without one designated owner; they *will* diverge, and reconciliation is now your job forever.
- **Unbounded ephemeral state.** Sessions, counters, or queues without TTLs are slow-motion memory leaks at the infrastructure level.
- **Confusing stateless with stateful *protocols*.** JWTs make session *lookup* stateless but make *revocation* a problem — you've traded a Redis read for an invalidation puzzle. Know which trade you made.

## <span class="tpl">05</span>Interview Perspective

Interviewers probe this with "how do you scale to N servers?" — the expected first move is "the app tier is stateless; sessions go to Redis; durable state in Postgres," because it unlocks the rest of the design. Follow-ups test the classification skill: *Where do WebSocket connections live? (in-flight, on the instance — so you need a pub/sub layer to route messages across instances.) What happens to in-progress jobs on deploy? (make them restartable; the queue redelivers.)* Naming the single-owner principle when consistency questions arise is a senior signal.

## <span class="tpl">06</span>Code / Pseudocode

```python
# State classification, expressed as code placement.

# DURABLE — Postgres, the owner of "what the user bought"
await db.execute("INSERT INTO orders ...")

# EPHEMERAL — Redis with TTL, the owner of "who is logged in"
await redis.set(f"session:{token}", user_id, ex=3600 * 24)

# DERIVED — Redis cache, owned by nobody, rebuildable, deletable
await redis.set(f"profile:{user_id}", json.dumps(profile), ex=300)

# IN-FLIGHT — process memory; written nowhere; restartable by design
async def process_export(job_id):
    rows = await fetch_rows(job_id)        # crash here? queue redelivers.
    csv = build_csv(rows)                  # pure compute on local state
    await minio.put(f"exports/{job_id}.csv", csv)   # durable only at the end
    await db.execute("UPDATE jobs SET status='done' WHERE id=$1", job_id)
```

## <span class="tpl">07</span>Related Concepts

- **Caching & Performance** — derived state's biggest category.
- **Data Modeling & Databases** — the home of durable state.
- **Consistency Models** — what "the same state on two machines" can promise.
- **The Actor Model** — an alternative: state owned by one actor, mutated only via messages.

**Source material:** *Designing Data-Intensive Applications* (Kleppmann) ch. 1 and 11 — the framing of derived vs. source-of-truth data; the Twelve-Factor App (factor VI, processes) for the stateless-service doctrine.

</div>

<div class="pane pane-build">

## Build Tasks — State Management

### Task 1 — Break sticky state
Run your FastAPI app with 4 Uvicorn workers and store a counter in a module-level dict. Hit it 100 times; observe four interleaved counters. Move it to Redis `INCR`; observe one.
- **Done when:** you can explain why dev (1 worker) hid the bug.

### Task 2 — Sessions that survive deploys
Implement Redis-backed sessions with TTL. Log in, kill and restart the app mid-session, verify the session lives.
- **Done when:** a rolling restart under load test produces zero forced logouts.

### Task 3 — Classify a real project
Take one of your current apps and inventory every piece of state into the four categories, marking its owner. Find at least one piece living in the wrong tier and migrate it.
- **Done when:** the inventory doc exists and the migration is shipped.

</div>
