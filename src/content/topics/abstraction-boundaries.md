---
title: 'Abstraction & Boundaries'
description: 'A boundary is where detail ends and interface begins. Good boundaries hide so much you do not need to read the implementation.'
readingTime: 10
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

An abstraction is a simplified view of something complex, hiding details behind a surface. A boundary is where that hiding happens — the API that says "here is what you can rely on; everything else is mine." Good abstractions hide so much that the user does not need to think about what is underneath; leaky abstractions expose so much detail that you must understand the whole system to use one part, defeating the purpose.

The test of a good abstraction is whether you can change the implementation without changing the client code. A `Repository` interface that clients rely on — `.get(id)`, `.save(object)` — lets the implementation switch from Postgres to SQLite without the client caring. A repository that exposes SQL, transaction handling, or connection semantics has failed as an abstraction; the client must understand the implementation.

<div class="concept-card">
<div class="cc-label">Core principle</div>

The best abstraction is the one you never question. The moment you think "how is this implemented?" or "what if the implementation changes," the abstraction is too thin.

</div>

## <span class="tpl">02</span>Mental Model

Boundaries are like **customs checks at a border**. The user wants goods (data, computation); the provider delivers them across the border. On the user's side, no one cares about the machinery — they just care that the goods arrive, the price is fair, and the schedule is reliable. Inside the customs house (the implementation), the machinery is complex and changing. A good boundary keeps both sides ignorant of the other's details.

## <span class="tpl">03</span>Real-World Example

**A cache abstraction that is too thin.** The interface exposes `.get(key)`, `.set(key, value, ttl)`, and `.delete(key)` — sounds reasonable. But it also returns raw serialized data if parsing fails, requires the caller to handle connection errors and retries, and exposes Redis-specific semantics ("this type can't be cached"). Callers know too much; changing to a different cache backend breaks them. A thick abstraction — one that handles serialization, connection pooling, retries, and error recovery internally — lets any backend swap in invisibly.

## <span class="tpl">04</span>Common Mistakes

- **Leaky abstractions.** Exposing implementation details (database connection, serialization format, API library details) in the interface.
- **Trying to hide too much.** An overly generic interface that doesn't match any implementation well — like a repository that claims to work with any database but forces all queries into a DSL that's worse than SQL.
- **Changing boundaries without changing clients.** Moving responsibility between layers without updating callers — the hidden cost of change doesn't actually hide; it spreads.
- **Boundaries that cross ownership lines.** When a boundary is also a team boundary, implementation details leak as political information, not technical necessity.

## <span class="tpl">05</span>Interview Perspective

Boundaries surface as "design the interface for X" questions. The strong answer is a boundary so clean that the interviewee couldn't tell you the implementation in two sentences — it's that well hidden. Volunteering what the boundary *hides* (how it schedules, what it retries, what it serializes) and what it *exposes* (just the happy path, under its own contract) shows design maturity. The phrase that signals depth: *"I ask, 'what detail is the client forced to know about?'" — if the answer is any, the boundary is leaky.*

## <span class="tpl">06</span>Code / Pseudocode

```python
# LEAKY: Client must understand implementation.
class RedisCache:
    def __init__(self, host, port, db):
        self.conn = redis.Redis(host, port, db)
    def get(self, key):
        v = self.conn.get(key)
        if v: return json.loads(v)
        return None
    def set(self, key, val, ttl):
        self.conn.setex(key, ttl, json.dumps(val))

# Client code sees Redis details and must handle serialization.

# THICK: Client knows nothing of implementation.
class Cache(Protocol):
    async def get(self, key: str) -> dict | None: ...
    async def set(self, key: str, val: dict, ttl: int) -> None: ...

class RedisCache:
    """Implementation hidden; serialization, retries, pooling are internal."""
    async def get(self, key: str) -> dict | None:
        try:
            v = await self.pool.get(key, timeout=0.1)
            return json.loads(v) if v else None
        except (asyncio.TimeoutError, ConnectionError):
            return None  # fail gracefully; client never sees it
    async def set(self, key: str, val: dict, ttl: int) -> None:
        # serialization, retry logic, pool management: all hidden
        ...

# Client code is identical for any Cache implementation.
```

## <span class="tpl">07</span>Related Concepts

- **Modularity & Coupling** — boundaries are where coupling is explicitly managed.
- **Backend Architecture** — the repository pattern is one formalization of a good boundary.
- **Hexagonal Architecture** — ports and adapters are boundaries as a system.

**Source material:** *Code Complete* (McConnell) ch. 6 on abstractions; *The Pragmatic Programmer* on the tyranny of leaky abstractions; Joel Spolsky's "Leaky Abstractions" essay.

</div>

<div class="pane pane-build">

## Build Tasks — Abstraction & Boundaries

### Task 1 — Measure leakiness
Take one existing abstraction in your codebase. Count how many implementation details clients must know (imports, exception handling, type conversions).
- **Done when:** you've quantified the leakiness and identified at least 3 details that should be hidden.

### Task 2 — Thicken a boundary
Wrap one leaky interface (e.g., a database client, a cache, an API library) with a Protocol-based abstraction that hides implementation details and handles errors.
- **Done when:** the client code is simpler and a test can swap the implementation with a fake without changing the client.

### Task 3 — Find the right level of abstraction
Design two implementations of the same interface (e.g., memory-based and Redis-based caches, or file-based and Postgres-based repositories). If either feels unnatural, the abstraction level is wrong.
- **Done when:** both implementations feel equally natural and neither is fighting the interface.

</div>
