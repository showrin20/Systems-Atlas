---
title: 'Caching & Performance'
description: 'A cache is a bet that the past predicts the future. Performance engineering is knowing exactly where the milliseconds of a request go — and which bets are safe.'
readingTime: 15
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Caching is storing a copy of expensive-to-compute data closer to where it's needed, trading **freshness** for **latency and load**. That trade is the entire subject: every cache decision is choosing how stale you can afford to be, and every cache bug is staleness you didn't choose.

Why it dominates real systems: a PostgreSQL primary might sustain ~10–50k simple queries/sec; a single Redis node serves hundreds of thousands of GETs at sub-millisecond latency; a CDN edge serves from memory a few milliseconds from the user. Most large systems are **read-heavy by 10:1 to 1000:1**, so a cache layer absorbing 95% of reads is the difference between three database replicas and thirty.

But caching is also the classic source of the hardest bugs, captured in Phil Karlton's line about the two hard problems in computer science — invalidation is one of them. A cache is **derived state**, and any derived state can disagree with its source.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Never ask "should I cache this?" Ask three questions instead: **How stale can this be?** (TTL) **What happens when it's wrong?** (invalidation + blast radius) **What happens when it's gone?** (cold start, stampede). If you can't answer all three, you're not adding a cache — you're adding a future incident.

</div>

## <span class="tpl">02</span>Mental Model

Picture a request as water flowing downhill through a series of dams. Each dam (cache layer) stops some fraction of the flow; only what leaks through reaches the next layer. The database at the bottom should receive a trickle.

<div class="diagram">
<svg viewBox="0 0 660 150" xmlns="http://www.w3.org/2000/svg">
  <rect class="dg-box" x="10" y="55" width="92" height="40"/>
  <text class="dg-text" x="26" y="79">Browser</text>
  <rect class="dg-box" x="140" y="55" width="92" height="40"/>
  <text class="dg-text" x="170" y="79">CDN</text>
  <rect class="dg-box" x="270" y="55" width="92" height="40"/>
  <text class="dg-text" x="290" y="79">App cache</text>
  <rect class="dg-box-hot" x="400" y="55" width="92" height="40"/>
  <text class="dg-text" x="427" y="79">Redis</text>
  <rect class="dg-box" x="530" y="55" width="100" height="40"/>
  <text class="dg-text" x="546" y="79">Database</text>
  <path class="dg-line" d="M102 75 L136 75" marker-end="none"/>
  <path class="dg-line" d="M232 75 L266 75"/>
  <path class="dg-line" d="M362 75 L396 75"/>
  <path class="dg-line" d="M492 75 L526 75"/>
  <text class="dg-text-dim" x="104" y="48">100%</text>
  <text class="dg-text-dim" x="236" y="48">40%</text>
  <text class="dg-text-dim" x="368" y="48">25%</text>
  <text class="dg-text-dim" x="500" y="48">3%</text>
  <text class="dg-text-dim" x="10" y="125">~0ms        ~10ms        ~0.1ms (in-process)        ~1ms        ~10–100ms</text>
</svg>
<div class="caption">Cascade of dams: each layer absorbs traffic; the percentages are what leaks through to the next layer.</div>
</div>

Two axes define every layer:

| Axis | Options | The trade |
|---|---|---|
| **Placement** | private (browser, in-process) vs shared (Redis, CDN) | private is faster, shared is consistent across instances |
| **Write strategy** | cache-aside, write-through, write-behind | who is responsible for keeping cache and source in sync, and when |

**Cache-aside** (lazy loading) is the default for app caches: read cache → miss → read DB → populate cache → return. The cache holds only what's actually requested, and the DB remains the source of truth. Its weakness is the **miss path under concurrency** — which leads to stampedes (below).

<details class="deep-dive">
<summary>Deep dive: cache stampede (thundering herd) and the three defenses</summary>
<div class="dd-body">

A hot key expires. In the next 50ms, 10,000 requests all miss, and all 10,000 issue the same expensive query. The database, sized for a trickle, receives a flood — and the latency spike causes more retries. This is a **cache stampede**, and it has taken down systems at Facebook scale (their memcache paper describes "leases" built specifically for it).

Three defenses, in increasing sophistication:

1. **Per-key locking / request coalescing** — only the first miss recomputes; the other 9,999 wait for its result (or briefly serve stale). Go's `singleflight` package is exactly this.
2. **Probabilistic early expiration** — each reader recomputes *slightly before* expiry with a probability that rises as TTL approaches zero, so refresh happens once, early, instead of everywhere at once.
3. **External refresh** — hot keys never expire from read traffic at all; a background job refreshes them on a schedule. The read path can no longer stampede because it can no longer miss.

</div>
</details>

## <span class="tpl">03</span>Real-World Example

**A product page on any large e-commerce site** is a tour of every cache layer at once:

- **CDN** serves images and the static shell from an edge node in the user's city — the origin never sees these requests.
- **Redis (cache-aside)** holds the product document — title, price, description — with a TTL of minutes. When a merchant edits the price, the service **deletes** the key (it doesn't update it — see Common Mistakes), and the next read repopulates from PostgreSQL.
- **In-process memory** caches tiny, ultra-hot data like category trees and feature flags, refreshed every 30 seconds, because even a 1ms Redis hop is too slow to pay 40 times per page render.
- **The stock counter is deliberately *not* cached.** Overselling inventory costs real money; freshness wins. Knowing what *not* to cache is the same skill.

Twitter's timeline is the other canonical example, in the opposite direction: instead of caching reads, they **precompute** them — a tweet is pushed into the Redis timeline list of every follower at write time (fan-out-on-write), so reading a home timeline is one cache fetch. Caching strategy follows read/write ratio.

## <span class="tpl">04</span>Common Mistakes

- **Updating the cache on write instead of deleting it.** Two concurrent writes can race: write A updates DB then cache, write B interleaves, and the cache holds A's value over B's row — *forever*, because nothing else corrects it. Delete-on-write means the worst case is one extra DB read.
- **Same TTL for everything.** If a deploy warms 100k keys with `TTL=3600`, exactly one hour later they all expire in the same second — a self-inflicted stampede. Always add jitter: `ttl = base + random(0, base * 0.1)`.
- **Caching before measuring.** Adding Redis in front of a query that was slow because of a missing index. Now there are two systems to operate and the p99 (cache misses) is still terrible. Profile first; cache is the *last* optimization on the read path, not the first.
- **Ignoring negative lookups.** "User not found" hammers the DB just as hard as "user found." Cache the absence (short TTL) — otherwise an attacker enumerating random IDs bypasses your cache entirely.
- **Treating the cache as durable.** If Redis is the *only* place data lives (sessions, carts), it isn't a cache anymore — it's a database with the persistence settings of a cache. Decide which one you're operating.

## <span class="tpl">05</span>Interview Perspective

Caching appears in essentially every system design interview, and the bar is higher than naming Redis:

- **State the read/write ratio first.** "Reads outnumber writes 100:1, so a cache-aside layer in front of the DB" — the ratio is the justification.
- **Name your invalidation story unprompted.** "TTL of 60s plus delete-on-write" is one sentence and shows you know where the bodies are buried.
- **Mention stampedes when you mention TTLs.** "Hot keys get request coalescing so expiry doesn't thundering-herd the database."
- **Do the capacity math.** 10M daily active users × 5 reads = 50M reads/day ≈ 580/sec average, ~3k/sec peak; one Redis node handles it, so the cache tier is for latency and DB protection, not horizontal scale. Numbers like these are what "senior" sounds like.
- Classic follow-up: *"What if the cache cluster dies?"* The answer they want: the DB must survive the full read load long enough to recover (load shedding, replicas, circuit breaker), or warm a standby — "it won't die" is the failing answer.

## <span class="tpl">06</span>Code / Pseudocode

Cache-aside with the three production necessities — jitter, negative caching, and stampede protection:

```python
import asyncio, random, json

_locks: dict[str, asyncio.Lock] = {}          # per-key, in-process coalescing
NEGATIVE = "__none__"

async def get_product(product_id: str) -> dict | None:
    key = f"product:{product_id}"

    if (cached := await redis.get(key)) is not None:
        return None if cached == NEGATIVE else json.loads(cached)

    # Coalesce concurrent misses: one flight per key per process.
    lock = _locks.setdefault(key, asyncio.Lock())
    async with lock:
        # Double-check: another coroutine may have filled it while we waited.
        if (cached := await redis.get(key)) is not None:
            return None if cached == NEGATIVE else json.loads(cached)

        row = await db.fetch_one(
            "SELECT * FROM products WHERE id = :id", {"id": product_id}
        )

        if row is None:
            await redis.set(key, NEGATIVE, ex=30)          # cache the absence, briefly
            return None

        ttl = 300 + random.randint(0, 30)                  # jitter kills synchronized expiry
        await redis.set(key, json.dumps(dict(row)), ex=ttl)
        return dict(row)


async def update_product(product_id: str, fields: dict):
    await db.execute(update_query(product_id, fields))
    await redis.delete(f"product:{product_id}")            # delete, never set
```

Note what's *absent*: no `redis.set` on the write path. The next reader repopulates. That asymmetry is what makes the race window harmless.

## <span class="tpl">07</span>Related Concepts

- **Networking Fundamentals** — CDNs, `Cache-Control`, and `ETag` are caching at the HTTP layer.
- **Data Modeling & Databases** — indexes and query plans; fix these before reaching for Redis.
- **Concurrency & Async Processing** — stampede protection *is* a concurrency-control problem.
- **State Management** — a cache is derived state; the consistency questions are the same.
- **Consistency Models** — "how stale is acceptable" formalized.

</div>

<div class="pane pane-build">

## Build Tasks — Caching & Performance

Use Redis + PostgreSQL (your existing stack). Seed a `products` table with ~100k rows. Measure everything — the numbers are the point.

### Task 1 — Baseline, then cache-aside

Build `GET /products/{id}` straight to PostgreSQL. Load test it (`hey -z 30s -c 100`) and record p50/p99 and max RPS. Then add cache-aside with a 5-minute TTL and re-run.

- **Done when:** you have a before/after table of p50, p99, RPS, and DB queries/sec, and can explain every difference.

### Task 2 — Reproduce a stampede, then fix it

Set one hot key's TTL to 10s. Run 200 concurrent clients against it and watch DB queries/sec at the moment of expiry (log every DB hit). You should see the spike.

- **Done when:** after adding per-key coalescing (Task pattern above), the same load test shows **exactly one** DB query per expiry window.

### Task 3 — Invalidation race

Write two scripts that concurrently update the same product (DB write + cache update) in a tight loop, with random delays injected between the DB write and the cache write. Detect divergence by comparing cache vs DB every second.

- **Done when:** you've observed stale-forever data with *update-on-write*, switched to *delete-on-write*, and can no longer reproduce divergence.

### Task 4 — Rate limiter (capstone)

Build a sliding-window rate limiter in Redis (sorted set per client: `ZADD` timestamp, `ZREMRANGEBYSCORE` old entries, `ZCARD` to count) as FastAPI middleware: 100 requests/min per API key, `429` with `Retry-After` beyond it.

- **Done when:** it enforces the limit correctly under concurrent load from multiple worker processes (this is why it must live in Redis, not process memory — write down that reasoning).

</div>
