---
title: 'Testing'
description: 'Tests are not about proving correctness — they are about changing code without fear. A test suite is the confidence to refactor.'
readingTime: 11
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

The purpose of automated tests is not to prove the absence of bugs (impossible) — it's to let you change the system quickly and confidently. A good suite catches regressions, documents intended behavior, and runs fast enough that you actually run it. The discipline is spending your testing budget where it pays:

- **Unit tests** — one function/class in isolation, no I/O, milliseconds each. Cover logic and edge cases. Numerous and fast.
- **Integration tests** — components together with real collaborators (a real database, a real queue). Cover the wiring unit tests can't: SQL, serialization, transactions. Fewer, slower, higher-value.
- **End-to-end tests** — the whole system through its real entry point. Cover critical user journeys. Few, slow, brittle — reserve for the handful of flows that must never break.

The shape these proportions form is the **test pyramid**: many unit, fewer integration, very few E2E. Inverting it (mostly slow E2E) gives a suite that's slow, flaky, and hard to debug — the "ice cream cone" anti-pattern.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Test behavior, not implementation. A test coupled to *how* the code works breaks on every refactor and tests nothing useful; a test coupled to *what* it does survives refactors and catches real regressions. The first measures fear of change; the second removes it.

</div>

## <span class="tpl">02</span>Mental Model

Think of tests as **a safety net under a trapeze**. The net doesn't make you a better acrobat — it makes you willing to attempt the hard move, because a fall is caught, not fatal. That willingness is the entire value: code with a trustworthy net gets refactored boldly; code without one calcifies, because every change risks an unseen break and engineers learn to stop touching it. The pyramid is about net *density*: a fine mesh (unit tests) over the whole area for cheap broad coverage, a few sturdy ropes (E2E) under the most dangerous moves. A net that's mostly thick ropes and few mesh is expensive, slow to inspect, and full of gaps.

## <span class="tpl">03</span>Real-World Example

**Testing an order service.** The pricing logic — discounts, tax, currency rounding — is dozens of fast unit tests on a pure function, covering edge cases (zero quantity, max discount, rounding at half-cents) in milliseconds with no database. The repository layer gets integration tests against a *real* PostgreSQL (spun up in a container per CI run), because the bugs there — a wrong join, a serialization mismatch, a transaction that doesn't roll back — are invisible to mocks; mocking the database would test your mock, not your SQL. Exactly one E2E test drives the full "add to cart → checkout → payment → confirmation" journey through the API, because that flow losing money is unacceptable and no lower test proves the whole chain wired correctly. The result: hundreds of tests run in seconds locally, the CI integration suite in a couple of minutes, and engineers refactor pricing daily without anxiety.

## <span class="tpl">04</span>Common Mistakes

- **Testing implementation details.** Asserting that a private method was called, or pinning exact internal call sequences. The test breaks when you refactor *correct* code — pure cost, no value. Assert on outputs and observable effects.
- **Over-mocking.** Mocking the database, the framework, and every collaborator until the test exercises only mocks. It passes while the real integration is broken. Mock at the system's edges (third-party APIs), use real collaborators inside.
- **The inverted pyramid.** Leaning on slow, flaky E2E tests because they "test everything." They're slow to run, painful to debug (which of 20 components failed?), and flaky enough that the team learns to ignore red — the worst outcome.
- **Chasing coverage percentage.** 100% coverage of trivial getters while the gnarly money logic has one happy-path test. Coverage measures lines executed, not behaviors verified. Target the risk, not the number.
- **Flaky tests left alive.** One flaky test that fails randomly trains everyone to re-run CI and ignore failures, destroying the suite's signal. Quarantine and fix or delete.

## <span class="tpl">05</span>Interview Perspective

Testing surfaces in code-review and design rounds as "how would you test this?" The strong answer names the *level* per concern: "pure pricing logic → unit; the repository's SQL → integration against real Postgres; the checkout journey → one E2E." Volunteering the pyramid and the behavior-not-implementation rule signals maturity, as does mentioning what you *wouldn't* test (trivial code) and where you mock (edges only). For "how do you test something with a database," the senior answer is a real containerized DB, not mocks — and explaining why mocks would hide the exact bugs that layer has. Connecting testing to deploy confidence ("the suite is what lets us ship multiple times a day") ties it to delivery.

## <span class="tpl">06</span>Code / Pseudocode

```python
# Unit: pure logic, no I/O, behavior-focused.
def test_discount_caps_at_50_percent():
    assert apply_discount(price=100, percent=80) == 50   # business rule, not internals

# Integration: real Postgres (testcontainers / a CI service), real SQL.
async def test_order_repo_roundtrip(pg_session):           # fixture spins up real DB
    repo = PgOrderRepository(pg_session)
    order = Order.new(user_id=1, items=[...])
    await repo.save(order)
    fetched = await repo.get(order.id)
    assert fetched == order                                # catches join/serialization bugs

# E2E: one critical journey through the real API.
async def test_checkout_journey(client):
    await client.post("/cart", json={"sku": "X", "qty": 1})
    r = await client.post("/checkout", json={"card": TEST_CARD})
    assert r.status_code == 201 and r.json()["status"] == "confirmed"
```

## <span class="tpl">07</span>Related Concepts

- **Backend Architecture** — the dependency rule (domain depends on nothing) is what makes fast unit tests possible.
- **Deployment & CI/CD** — tests are the gates in the pipeline.
- **Software Quality** — testing is one pillar; review and static analysis are others.
- **Evolutionary Code & Refactoring** — tests are the prerequisite that makes safe refactoring possible.

**Source material:** *Working Effectively with Legacy Code* (Feathers) — defines a "seam" and how to get untested code under test; Martin Fowler's "Test Pyramid" and "Mocks Aren't Stubs" essays; *Unit Testing Principles, Practices, and Patterns* (Khorikov) for the behavior-vs-implementation distinction.

</div>

<div class="pane pane-build">

## Build Tasks — Testing

### Task 1 — Build the pyramid for one feature
Take a feature with logic + persistence + an endpoint. Write the three layers: unit (logic), integration (repo against real Postgres via testcontainers), one E2E (the endpoint).
- **Done when:** units run in <1s, integration in <30s, and you can state which bug each layer would catch.

### Task 2 — Refactor under the net
After Task 1, aggressively refactor the internal implementation of the logic (rename, restructure) without changing behavior.
- **Done when:** tests stay green throughout — proving they test behavior, not implementation. If any broke, fix the test to assert outputs.

### Task 3 — Over-mock, then feel the pain
Write a version of the repo test that mocks the database. Introduce a real SQL bug (wrong column). Show the mocked test passes while the integration test fails.
- **Done when:** you can demonstrate the mock hiding a real defect.

### Task 4 — Kill a flake
Find or create a timing-dependent flaky test. Diagnose the nondeterminism and make it deterministic.
- **Done when:** it passes 100/100 runs in a loop.

</div>
