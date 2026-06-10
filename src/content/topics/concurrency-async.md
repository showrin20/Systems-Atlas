---
title: 'Concurrency & Async Processing'
description: 'Concurrency is structure, parallelism is execution. The craft is letting many things be in flight at once without letting them corrupt each other.'
readingTime: 16
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

**Concurrency** is dealing with many things at once (structure); **parallelism** is doing many things at once (execution). A single-core Node.js server juggling 10,000 open connections is highly concurrent with zero parallelism. A data pipeline crunching arrays on 32 cores is parallel. Backend engineering is mostly the first problem: requests arrive whenever they want, and almost all of their lifetime is spent **waiting** — for the database, for another service, for the disk.

That waiting is the entire economic argument. A request that takes 100ms might use 2ms of CPU; the other 98ms the thread is idle. Concurrency models are different answers to one question: *what do we do with the waiting?*

- **Thread-per-request** (classic Java, Python with workers): the OS parks the waiting thread and runs another. Simple code, but each thread costs ~1MB of stack and a context switch, so 10k connections = 10GB of stacks.
- **Event loop + async/await** (Node, Python asyncio, your FastAPI services): one thread, thousands of paused coroutines, each a few KB. Waiting becomes a suspension point (`await`), not a parked thread.
- **Lightweight runtime threads** (Go goroutines, Java virtual threads): the runtime multiplexes millions of cheap "threads" onto a few OS threads — thread-style code, event-loop economics.

The danger arrives with **shared mutable state**. Two flows reading and writing the same data interleave in orders you didn't write, producing races, lost updates, and deadlocks — bugs that pass every test and appear at 2 a.m. under production load.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Concurrency bugs are never about code that runs — they're about **interleavings** you didn't consider. The fix is rarely "add a lock"; it's restructuring so the dangerous interleaving cannot exist: share by communicating (queues), make operations atomic at the data layer, or make state immutable.

</div>

## <span class="tpl">02</span>Mental Model

Think of a **kitchen with one chef** (the event loop). The chef never stands watching a pot boil; they put the pot on (`await db.fetch(...)`), start plating another order, and return when the pot whistles (the I/O completes). One chef can run twenty dishes — *as long as every step is short*.

Now one recipe says "stir continuously for 10 minutes" (a CPU-bound task, or a blocking call like `requests.get` inside async code). The chef is stuck stirring. Every other dish burns. **That is blocking the event loop**, and it's the most common production failure in async services: one synchronous call in one handler degrades the p99 of every endpoint in the process.

<div class="diagram">
<svg viewBox="0 0 660 215" xmlns="http://www.w3.org/2000/svg">
  <text class="dg-text" x="10" y="20">Event loop timeline (one thread)</text>
  <rect class="dg-box-hot" x="10" y="36" width="80" height="26"/>
  <text class="dg-text-dim" x="18" y="53">req A: cpu</text>
  <rect class="dg-box" x="92" y="36" width="120" height="26" stroke-dasharray="4 3" fill="none" stroke="var(--text-faint)" rx="6"/>
  <text class="dg-text-dim" x="104" y="53">A awaits DB…</text>
  <rect class="dg-box-hot" x="92" y="70" width="70" height="26"/>
  <text class="dg-text-dim" x="100" y="87">req B: cpu</text>
  <rect class="dg-box" x="164" y="70" width="100" height="26" stroke-dasharray="4 3" fill="none" stroke="var(--text-faint)" rx="6"/>
  <text class="dg-text-dim" x="174" y="87">B awaits API…</text>
  <rect class="dg-box-hot" x="214" y="36" width="80" height="26"/>
  <text class="dg-text-dim" x="222" y="53">A resumes</text>
  <text class="dg-text" x="10" y="135">Same loop with one blocking call</text>
  <rect class="dg-box-hot" x="10" y="150" width="60" height="26"/>
  <text class="dg-text-dim" x="18" y="167">req A</text>
  <rect x="72" y="150" width="300" height="26" fill="color-mix(in srgb, var(--danger) 18%, transparent)" stroke="var(--danger)" rx="6"/>
  <text class="dg-text-dim" x="84" y="167">req B: requests.get() — BLOCKS EVERYTHING</text>
  <rect class="dg-box" x="374" y="150" width="60" height="26" stroke-dasharray="4 3" fill="none" stroke="var(--text-faint)" rx="6"/>
  <text class="dg-text-dim" x="380" y="167">A waits</text>
  <text class="dg-text-dim" x="10" y="200">awaits interleave work; one sync call serializes the whole process</text>
</svg>
<div class="caption">Top: cooperative multitasking working. Bottom: one blocking call starving every coroutine in the process.</div>
</div>

For work that doesn't fit the request at all — sending email, generating a video, calling a slow third party — the model extends to a **second kitchen**: enqueue a job (Celery/Redis, SQS) and return immediately. The queue decouples *accepting* work from *doing* work, which is also what gives you **backpressure**: when producers outrun consumers, the queue's depth is a visible, bounded buffer instead of an invisible pile of timed-out requests.

<details class="deep-dive">
<summary>Deep dive: the lost update — anatomy of a race condition</summary>
<div class="dd-body">

The canonical race, in any language:

```
balance = read()        # A reads 100        B reads 100
balance += 50           # A computes 150     B computes 150
write(balance)          # A writes 150       B writes 150   ← 50 lost
```

Read-modify-write is three steps; concurrency interleaves them. Fixes, in order of preference:

1. **Push atomicity to the data layer:** `UPDATE accounts SET balance = balance + 50 WHERE id = $1` — the database serializes it for you. Same idea: Redis `INCR`, atomic compare-and-swap.
2. **Optimistic locking:** read a `version` column, write with `WHERE version = $old`; zero rows updated means retry. Great when conflicts are rare.
3. **Pessimistic locking:** `SELECT ... FOR UPDATE` or a mutex. Correct, but now you own lock ordering — and two locks acquired in different orders by two flows is a textbook **deadlock**.

Notice the pattern: the best fixes *remove the interleaving* rather than guard it.

</div>
</details>

## <span class="tpl">03</span>Real-World Example

**A checkout service during a flash sale** exercises every concept in this topic at once:

- The API tier is async (FastAPI/Node): each instance holds hundreds of in-flight checkouts, nearly all of them awaiting Postgres or the payment gateway. Thread-per-request would need ~50× the memory for the same connection count.
- Inventory decrement is the race condition with money attached. It's done atomically — `UPDATE inventory SET count = count - 1 WHERE sku = $1 AND count > 0` — and the row count of that statement *is* the answer to "did I get one?" No application-level read-modify-write survives a flash sale.
- Payment capture, receipt email, and warehouse notification go onto a queue. The user sees "order confirmed" in 300ms; workers chew through the backlog at their own pace. During the spike, **queue depth** is the dashboard everyone watches — it's the backpressure gauge.
- The payment gateway rate-limits to 500 req/s, so workers pull through a semaphore sized to match. Without it, the burst would turn into a wall of 429s and retries — a self-inflicted DDoS.

This is also why "stateless services + stateful infrastructure" is the standard shape: app instances share nothing, and all contended state lives in systems built to arbitrate concurrency (Postgres, Redis, the queue).

## <span class="tpl">04</span>Common Mistakes

- **Blocking calls in async handlers.** `requests.get()`, `time.sleep()`, heavy pandas work, or a sync ORM inside `async def` — the single most common async-service bug. Use async clients, or push sync work to a thread/process pool (`run_in_executor`).
- **Unbounded concurrency.** `asyncio.gather(*[fetch(u) for u in urls])` over 10,000 URLs opens 10,000 sockets and DDoSes the target (or exhausts your own file descriptors). Always bound with a semaphore or worker pool.
- **Fire-and-forget without a failure story.** A background task that silently dies takes its work with it. Queues exist because they make failure *visible*: retries, dead-letter queues, depth metrics.
- **Non-idempotent queue consumers.** Every mainstream queue is at-least-once delivery. A consumer that sends an email per message will eventually send it twice. Consumers must be idempotent — dedupe on a message ID.
- **Sprinkling locks instead of removing shared state.** Each lock added to patch a race increases deadlock surface. Step back and ask: can the database arbitrate this? Can it become a message? Can the state be owned by exactly one writer?
- **Confusing concurrency with speed for CPU work.** async/await does nothing for CPU-bound tasks on one thread (and in Python, the GIL gates threads too). CPU work needs processes or native code — a different tool entirely.

## <span class="tpl">05</span>Interview Perspective

Concurrency shows up in two distinct interview forms — know which one you're in:

**System design form:** the interviewer pushes load until you introduce async processing. The expected moves: *"Anything not needed for the response goes to a queue"*; *"consumers are idempotent because delivery is at-least-once"*; *"we monitor queue depth and scale consumers on it."* For contended writes (ticket sales, inventory), they're listening for atomic conditional updates or explicit locking strategy — say *"the database serializes the decrement; the app never does read-modify-write."*

**Coding/knowledge form:** explain a race condition with a concrete interleaving (the lost-update table above is a perfect whiteboard answer); explain async vs threads in terms of *what happens during I/O wait*; for Python specifically, the GIL question — threads for I/O-bound, processes for CPU-bound, asyncio for high-concurrency I/O.

The one-liner that signals depth in either form: **"throughput problems get queues, correctness problems get atomicity — and I never solve one with the other's tool."**

## <span class="tpl">06</span>Code / Pseudocode

Bounded concurrency + atomic claim — the two patterns that fix the two most common bugs:

```python
import asyncio

# ---- Pattern 1: worker pool with bounded fan-out -------------------------
# Fetch 10,000 URLs, never more than 20 in flight.

async def fetch_all(urls: list[str], limit: int = 20) -> list[dict]:
    sem = asyncio.Semaphore(limit)

    async def fetch_one(url: str) -> dict:
        async with sem:                          # at most `limit` concurrent
            async with http.get(url, timeout=10) as resp:
                return await resp.json()

    # return_exceptions: one failure must not cancel 9,999 successes
    results = await asyncio.gather(
        *(fetch_one(u) for u in urls), return_exceptions=True
    )
    return [r for r in results if not isinstance(r, Exception)]


# ---- Pattern 2: atomic job claim (safe with N competing workers) ---------
# The WHERE clause + row count is the lock. No mutex, no race.

async def claim_next_job(worker_id: str) -> Job | None:
    row = await db.fetch_one(
        """
        UPDATE jobs
           SET status = 'running', worker = :w, started_at = now()
         WHERE id = (
               SELECT id FROM jobs
                WHERE status = 'pending'
                ORDER BY created_at
                LIMIT 1
                FOR UPDATE SKIP LOCKED      -- workers never block each other
         )
        RETURNING *
        """,
        {"w": worker_id},
    )
    return Job(**row) if row else None
```

`FOR UPDATE SKIP LOCKED` is worth memorizing: it turns PostgreSQL into a correct multi-consumer job queue in one statement, and it's the answer to "how do N workers share a table without double-processing?"

## <span class="tpl">07</span>Related Concepts

- **Computing & Runtime Basics** — threads, processes, and the event loop are the substrate here.
- **Error Handling & Resilience** — timeouts, retries, and backpressure govern concurrent flows under failure.
- **Caching & Performance** — stampede protection is concurrency control applied to cache misses.
- **The Actor Model** — concurrency with *zero* shared state: one mailbox, one owner per piece of state.
- **Event-Driven Architecture** — queues promoted from implementation detail to system backbone.

</div>

<div class="pane pane-build">

## Build Tasks — Concurrency & Async Processing

Python asyncio + PostgreSQL + Redis. Every task here reproduces a real production failure before fixing it — the reproduction is mandatory.

### Task 1 — Block the loop, then see it

Build a FastAPI app with `/fast` (returns immediately) and `/slow` (calls `time.sleep(3)` — deliberately wrong). Load test `/fast` alone, then again while hitting `/slow`.

- **Done when:** you've recorded `/fast`'s p99 collapsing, then fixed `/slow` two ways (async sleep; `run_in_executor`) and verified `/fast` is unaffected. Write three sentences on why.

### Task 2 — Lose an update, then make it impossible

Create `accounts(id, balance)`. Run 100 concurrent "+10" operations implemented as read-modify-write in Python.

- **Done when:** final balance ≠ expected (you've reproduced the race), then equals expected with (a) an atomic `UPDATE ... SET balance = balance + 10`, and (b) optimistic locking with a version column and retry loop. Count the retries in (b) and explain when you'd prefer each.

### Task 3 — Worker pool with backpressure

Build a producer that enqueues 1,000 jobs (random 0.1–2s sleeps) into a `jobs` table, and N workers using the `FOR UPDATE SKIP LOCKED` claim pattern. Expose queue depth as a metric every second.

- **Done when:** with N=4 you can watch depth grow while producers outrun consumers, scale to N=16 mid-run, and watch it drain — and no job ever runs twice (assert on a `runs` counter per job).

### Task 4 — Rate-limited fan-out (capstone)

Fetch 500 URLs (use a local mock server) where the target allows 10 req/s. Combine a semaphore (max in-flight) with a token-bucket (max rate) — they are different limits; you need both.

- **Done when:** the mock server logs confirm the rate never exceeds 10/s, failures are retried with exponential backoff + jitter, and total wall time is within 10% of theoretical minimum.

</div>
