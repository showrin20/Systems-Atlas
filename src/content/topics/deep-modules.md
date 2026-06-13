---
title: 'Deep Modules & Information Hiding'
description: 'A module with a small interface hiding a lot of complexity is better than a module that leaks everything. Depth is the measure.'
readingTime: 10
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

A module's value is the **depth** of the functionality it hides relative to the complexity of its interface. A deep module has a simple API that hides complex, valuable logic. A shallow module has a complex API relative to what it does — the interface is as complicated as understanding the implementation would be.

Ousterhout's framing: "The best modules are those whose interfaces are much simpler than their implementations." An example of deep: a disk cache with `get(key)` and `set(key, value)` that internally manages eviction, persistence, and write-through. The caller knows nothing of B-trees or write patterns; they just store and retrieve. An example of shallow: a JSON serializer that exposes `serialize()`, `deserialize()`, `validate()`, `transform()`, and requires the caller to know about escaping, chunking, and error recovery.

The discipline is ruthless about API surface: every public method, every parameter, every exception is a commitment. Minimize surface; hide everything that isn't essential.

<div class="concept-card">
<div class="cc-label">Core principle</div>

The complexity of your module is the sum of what callers must understand. Make it simple by hiding what they don't need to know.

</div>

## <span class="tpl">02</span>Mental Model

A car's transmission. The driver's interface is a stick or buttons (simple). The implementation is gear ratios, clutches, and hydraulics (complex). The depth is huge — simple interface, massive hidden value. Compare to a poorly designed transmission where the driver must understand oil viscosity, torque curves, and manual shift points — shallow.

## <span class="tpl">03</span>Real-World Example

**PostgreSQL's B-tree index vs. a hand-rolled index.** PostgreSQL: `CREATE INDEX idx_name ON table(col)`. The interface is almost a sentence. The implementation is thousands of lines of code handling splits, rebalancing, concurrency, and persistence — enormous depth. A hand-rolled index that exposes insert/search/delete but requires the caller to manage memory, concurrency, and structure is shallow; the implementation is easier to write but harder to use.

## <span class="tpl">04</span>Common Mistakes

- **Leaky abstractions.** An object mapper that exposes lazy loading, connection pooling, and query planning; the caller must manage all three or performance suffers.
- **Too-general interfaces.** A "utils" function that accepts a dozen parameters and behaves differently based on their combination hides nothing; callers must memorize it.
- **Public implementation details.** A cache that exposes its eviction policy or TTL math in the type signature is shallow; callers must understand the implementation to use it correctly.
- **Mixing API layers.** A service that exposes both low-level primitives and high-level operations in one interface confuses both; separate them.

## <span class="tpl">05</span>Interview Perspective

Deep modules are less commonly asked but signal design maturity. When architecture is discussed, volunteering that you design for depth ("the interface is simple; the internals are complex") shows intentionality. In code review, the insight to look for is whether a public method truly needs to be public or if it's leaking implementation.

## <span class="tpl">06</span>Code / Pseudocode

```python
# SHALLOW: caller must understand the internals
class Cache:
    def get(self, key):
        if key in self.lru_order:
            self.lru_order.move_to_end(key)
            return self.data[key]
        return None
    def set(self, key, value, ttl=None):
        if len(self.data) >= self.max_size:
            self.evict_lru()
        self.data[key] = (value, time.time() + (ttl or 3600))
        self.lru_order[key] = None

# Caller must know: LRU order, TTL, eviction

# DEEP: caller knows nothing of the implementation
class Cache:
    def __init__(self, max_size=1000):
        self.data = {}
        self.max_size = max_size
        self.hits = self.misses = 0
    
    def get(self, key):
        if self.has_key(key):
            self.hits += 1
            return self._get_impl(key)
        self.misses += 1
        return None
    
    def set(self, key, value, ttl_seconds=3600):
        """Set a key-value pair with optional TTL. Eviction is automatic."""
        self._set_impl(key, value, ttl_seconds)
    
    # Everything else is private; caller doesn't need to know it exists
    def _get_impl(self, key): ...
    def _set_impl(self, key, value, ttl): ...
    def _evict_if_needed(self): ...
```

## <span class="tpl">07</span>Related Concepts

- **Abstraction & Boundaries** — deep modules are usually the result of good boundaries.
- **Modularity & Coupling** — deep modules have fewer coupling points.

**Source material:** *A Philosophy of Software Design* (Ousterhout) ch. 5–6 on deep modules and information hiding.

</div>

<div class="pane pane-build">

## Build Tasks — Deep Modules

### Task 1 — Measure interface depth
Take an existing module. Count the public methods and parameters; estimate the lines of implementation per method. Compute a "depth" ratio (implementation lines / interface complexity).
- **Done when:** you have a measurement for at least three modules and can rank them by depth.

### Task 2 — Deepen a shallow module
Take the shallowest module from Task 1. Hide implementation details; remove unnecessary public methods. Measure again.
- **Done when:** depth increased by at least 2× and callers' code simplified.

</div>
