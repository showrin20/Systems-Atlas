---
title: 'Modularity & Coupling'
description: 'Coupling is the cost of change. Low coupling is not elegant — it is economical. It is the difference between a one-file change and a ten-file refactor.'
readingTime: 11
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Modularity is the property that changes are *local* — you can understand and modify a piece without understanding the whole. Coupling is the degree to which two modules depend on each other's details. Every coupling is a promise that when one changes, the other must follow; the more promises, the higher the cost of change. The architecture goal is maximizing modularity — making each module a change capsule — by minimizing coupling.

Two types of coupling matter most:

- **Structural coupling** — module A imports from module B, directly or transitively. Breaks the module boundary. Examples: importing a model from another service, importing a constant from another team's code.
- **Behavioral coupling** — module A depends on module B doing something in a specific way. Examples: assuming a function returns data in a particular format, assuming a database column exists, assuming an API endpoint responds within 1 second.

The central insight: **you cannot eliminate coupling entirely** (the system must fit together somehow), but you can move it to the edges and make it explicit. A service boundary is a place where coupling is *visible* and *negotiated* as an API contract, instead of implicit and scattered through imports.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Coupling is the enemy of understanding. The best architecture is the one where you can change a piece without reading a dozen other files. When that becomes hard, the codebase has won — over you.

</div>

## <span class="tpl">02</span>Mental Model

Picture a module as a **Lego brick**. A brick with many exposed studs (lots of exports, internal structure visible) couples easily with other bricks but is fragile — move it and you might break three connections. A brick with few studs but deep internal connections is rigid but more modular: it couples at fewer points, so moving it breaks fewer things. The refactor that matters is going from "every internal decision is visible and coupled" to "the module presents a small, stable interface, and internals are opaque."

## <span class="tpl">03</span>Real-World Example

**A monolith's payment module coupled to every other module.** It imports models from orders, users, and inventory; other modules import payment functions directly; the model is scattered through five files. Adding a new payment method requires touching six modules, and every edit risks breaking something non-obvious. After decoupling — defining a payment interface (charge this, refund this), hiding the model inside the module, having other modules call through the interface — changes are local. The interface stays stable, the internals are private, and a new payment method is one file plus tests.

## <span class="tpl">04</span>Common Mistakes

- **Cyclic dependencies** (A imports B, B imports A). Breaks modularity; makes testing hard; can't understand one without the other. If you see a cycle, something is misplaced.
- **Shared utility modules that become dumping grounds.** A `utils.py` that every module imports couples them all together; it becomes so tangled that changing it breaks random things. Utility functions belong close to where they're used.
- **Global mutable state.** Coupling through a global variable is the tightest coupling possible; anything that touches it must coordinate with everything else.
- **Importing from multiple levels down** (A.B.C.impl). You're importing implementation details; the module boundary is upstream somewhere.
- **Coupling to specific database engines, frameworks, or libraries in the domain layer.** The domain is supposed to be portable; if it can't run without FastAPI or Postgres, you've embedded infrastructure into business logic.

## <span class="tpl">05</span>Interview Perspective

Coupling appears in design reviews as "show me the module boundaries" and in codebase discussions as "why is this hard to change?" The strong answer identifies where coupling is high and proposes an interface to lower it. Mentioning that you measure coupling (counting imports, looking for cycles, assessing how many files change together) signals systems thinking. The phrase that matters: *"I ask 'how many files must I touch to make this change?' — if the answer is more than three, there's a structural problem."*

## <span class="tpl">06</span>Code / Pseudocode

```python
# BAD: High coupling — A couples directly to B's internals.
# orders/models.py
class Order:
    def __init__(self, items, user):
        from inventory.models import Product  # structural coupling
        self.items = items
        self.user = user

# GOOD: Low coupling — A defines an interface, B implements it.
# orders/interfaces.py
class InventoryService(Protocol):
    async def reserve(self, sku: str, qty: int) -> bool: ...

# orders/use_cases.py
async def place_order(inventory: InventoryService, ...):
    if not await inventory.reserve(sku, qty):
        raise OutOfStock()

# inventory/service.py
class RealInventoryService:
    async def reserve(self, sku: str, qty: int) -> bool:
        ...  # implementation detail, completely hidden
```

## <span class="tpl">07</span>Related Concepts

- **Backend Architecture** — the dependency rule is how you enforce low coupling.
- **Abstraction & Boundaries** — coupling through interfaces instead of details.
- **Hexagonal Architecture** — ports and adapters as the formal decoupling pattern.

**Source material:** *A Philosophy of Software Design* (Ousterhout) ch. 3–5 on coupling and complexity; *Fundamentals of Software Architecture* (Ford & Richards) ch. 8 on modularity; the DDD *Strategic* concepts on bounded contexts and anti-corruption layers.

</div>

<div class="pane pane-build">

## Build Tasks — Modularity & Coupling

### Task 1 — Find and break a cycle
Use a tool like `networkx` or `import-linter` to draw your project's import graph. If there's a cycle, refactor to break it (move code, introduce an interface).
- **Done when:** the dependency graph is acyclic.

### Task 2 — Measure coupling before and after
Pick a module that's hard to understand. Count its imports and its importers (structural). Count how many files you touch in a typical change. Then, refactor one layer of it to an interface. Re-measure.
- **Done when:** you have numbers showing both structural and behavioral coupling decreased.

### Task 3 — Hide the database
Wrap one of your repositories behind a Protocol/interface. Add an in-memory implementation. Swap them in tests vs production code.
- **Done when:** domain logic has zero knowledge of SQL, only of the interface contract.

### Task 4 — Decouple a config
Move hardcoded values (timeouts, URLs, API keys) to environment variables or a config object, and ensure tests can swap them without importing modules.
- **Done when:** tests can run against a mock service by passing a different config, with zero imports of the real service.

</div>
