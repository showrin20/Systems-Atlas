---
title: 'Consistency Models'
description: 'What does "consistent" mean when data lives on multiple machines? The answer determines what guarantees your system makes and which bugs are possible.'
readingTime: 12
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Consistency is a spectrum, not a binary. When data is replicated across machines, "the two copies agree" becomes a question of *when* and *how much* they must agree. The stronger the consistency, the slower the system; the weaker, the faster but the more anomalies users must tolerate.

The models, from strongest to weakest:

- **Linearizability / Strict Consistency** — every read sees the most recent write. The database acts like a single machine with one correct copy. Expensive: requires coordination between replicas before returning.
- **Sequential Consistency** — reads are always consistent; writes appear in some total order, but may not match wall-clock time. Weaker than linearizability, still expensive.
- **Causal Consistency** — if A causes B (e.g., Alice writes, then reads her own write), causality is preserved. Concurrent writes can be reordered.
- **Eventual Consistency** — replicas eventually agree, but temporarily diverge. The weakest; allows blazing speed and partition tolerance at the cost of stale reads and potential conflicts.

The choice is architectural: a payment ledger needs linearizability (double-charges are catastrophic); a recommendation feed can tolerate eventual consistency (stale recommendations are acceptable).

<div class="concept-card">
<div class="cc-label">Core principle</div>

The cost of consistency is latency and availability. Choose the weakest consistency your use case allows; the difference between linearizability and eventual consistency is often 10× latency.

</div>

## <span class="tpl">02</span>Mental Model

A mirror and its reflection. A perfect mirror is **linearizable** — the reflection matches the object exactly and instantly. A slightly delayed mirror (video over a slow link) is **eventually consistent** — the reflection eventually matches, but there's lag. A broken mirror with multiple fragments is **causal consistent** — the fragments relate to each other (you can see how they caused each other) but don't show the whole picture. Most systems operate on eventual consistency: your social media post reaches different friends at different times, but eventually everyone sees it in the same order.

## <span class="tpl">03</span>Real-World Example

**A distributed ledger and a feed service.** Ledger: Bank A transfers \$100 to Bank B; Bank B immediately sees the credit. Linearizability is essential (money mustn't vanish). Infrastructure: a primary/backup with strong replication, failover is coordinated and blocks writes briefly. Feed: you like a post; your friends see the like within seconds, not instantly. Eventual consistency is fine. Infrastructure: writes are fast and local; replicas catch up asynchronously. The same transaction latency budget (say, 100ms for the bank, 1s for the feed) reflects consistency cost.

## <span class="tpl">04</span>Common Mistakes

- **Assuming replication is transparent.** Code that works on a single machine breaks on a replica (stale reads, lost updates) — the consistency model must be in the contract, not hidden.
- **Eventual consistency without conflict resolution.** Two writes to the same key on different replicas create a conflict; someone must decide which wins (last-write-wins, merge, or explicit resolution).
- **Causal consistency without tracking it.** Libraries like Riak KV provide it, but you must pass the version vector on every request — if you forget, consistency breaks silently.
- **Confusing availability with consistency.** A system can be available (responding) and inconsistent (returning stale data) — they are different axes.

## <span class="tpl">05</span>Interview Perspective

Consistency models are probed with "what if a replica is slow or partitioned?" The strong answer identifies a use case and its consistency requirement: "Bank transfers need linearizability because money can't duplicate; I use a primary/backup with synchronous replication and quorum reads. User feeds can tolerate eventual consistency; I replicate asynchronously." Mentioning the trade-off (latency for consistency) signals real understanding.

## <span class="tpl">06</span>Code / Pseudocode

```python
# Demonstrating consistency tiers

# LINEARIZABLE: quorum read/write, all-or-nothing
async def linearizable_read(key, replicas):
    responses = await asyncio.gather(*(r.get(key) for r in replicas))
    # Require majority to agree; return most recent
    if sum(1 for r in responses if r.version == max(v.version for v in responses)) > len(replicas) // 2:
        return max(responses, key=lambda r: r.version)
    raise InconsistentState()

# EVENTUAL: write locally, replicate asynchronously
async def eventual_write(key, value, primary):
    await primary.set(key, value)
    # Replicate in background; don't block
    asyncio.create_task(replicate_to_backups(key, value))
    return  # return immediately

# CAUSAL: write increments a version vector; read checks if client has seen all causally prior writes
version_vector = {}  # {client_id: {node: timestamp}}
async def causal_read(key, replica):
    value = await replica.get(key, min_vector=version_vector)
    update_vector(version_vector, value.vector)
    return value
```

## <span class="tpl">07</span>Related Concepts

- **Fallacies of Distributed Computing** — partition tolerance forces the consistency choice.
- **Consensus** — one algorithm for achieving linearizability.
- **Event-Driven Architecture** — eventual consistency is the model for replicated events.

**Source material:** *Designing Data-Intensive Applications* (Kleppmann) ch. 9 on consistency; the Jepsen blog on consistency models tested in real systems.

</div>

<div class="pane pane-build">

## Build Tasks — Consistency Models

### Task 1 — Observe eventual consistency
Replicate a key-value store asynchronously. Write to one replica; immediately read from another. Observe that the read may not see the write.
- **Done when:** you've recorded the lag between write and visibility on replicas.

### Task 2 — Add quorum for linearizability
Modify the system to require reads/writes to hit a quorum (majority). Observe that reads are always fresh but latency increases.
- **Done when:** you have before/after latency numbers and can explain the trade-off.

### Task 3 — Conflict resolution
Write the same key on two replicas concurrently. Observe the conflict; implement last-write-wins and merge resolution.
- **Done when:** conflicts are detected and resolved deterministically.

</div>
