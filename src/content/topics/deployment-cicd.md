---
title: 'Deployment & CI/CD'
description: "A deploy is the riskiest moment in a service's life. CI/CD moves the risk left—to commit time—where it's cheaper to fix."
readingTime: 12
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

The simplest deploy — one engineer, one button, ten minutes to rollback — breaks past a few hundred engineers and multiple services. Continuous Integration (running tests and checks on every commit) and Continuous Deployment (running those same checks, then automatically deploying) flatten that risk. The pipeline is not about speed (though speed helps catch regressions faster); it's about *repeatability* — every commit that reaches main goes through the same gauntlet, and if it exits the other side, it's as ready as humans and automation can make it.

The layers of the pipeline, in order:

- **Build** — compile, lint, type-check. Catch syntax and style before anything runs.
- **Test** — unit, integration, contract tests. The safety net.
- **Deploy to staging** — the same binaries, the same infrastructure, the real database — as close to prod as possible while still safe to break.
- **Smoke tests** — basic health checks on staging (200s on /health, records exist, queues drain). Catch integration breaks.
- **Deploy to production** — either immediately, or behind progressive rollout (canary, blue-green).

Each gate should fail fast and be independent — a flaky test or a slow scan backing up the pipeline defeats the purpose.

<div class="concept-card">
<div class="cc-label">Core principle</div>

The safest deploy is the smallest, most frequent one. A thousand-line refactor is dangerous once a month; the same refactor, one file per day, is invisible. Continuous deployment doesn't prevent all failures — it makes them small enough to handle without drama.

</div>

## <span class="tpl">02</span>Mental Model

Think of the pipeline as a **series of filters**. Most commits pass through unchanged; a few hit a gate and get held. The wider the gates and the earlier the cheap gates, the faster valid code flows and the less blocking time is wasted on false positives. A pipeline where one flaky integration test blocks 50 engineers' branches is a bad pipeline — either fix the test or replace the gate. A pipeline where a build fails in 30 seconds, before tests even start, removes the "wait for tests while reading Twitter" phase of development.

## <span class="tpl">03</span>Real-World Example

**A team shipping multiple times a day.** Every commit triggers the pipeline: build (30s), unit tests (45s), integration tests (2m). If all pass, it's staged on a canary (1% of traffic); if canary health metrics (latency, errors) stay green for 5 minutes, a blue-green deploy swaps all traffic. If metrics degrade, the old version is live again, usually before anyone notices. This cadence — hours from idea to prod, not weeks — is only possible because the pipeline is trusted: the tests have caught the class of bug that would slow them down and pull the chain. A failed deploy is not a crisis (rollback is instant and automatic) but a learning opportunity, and the same code path is tried again tomorrow.

## <span class="tpl">04</span>Common Mistakes

- **Shipping without running the tests locally first.** "CI will catch it" is the mindset that bloats the pipeline — run before pushing.
- **Slow gates.** A build that takes 10 minutes trains engineers to batch commits (less feedback). 5 minutes is the mental boundary — faster trains better habits.
- **Flaky tests in the pipeline.** One test that passes 90% of the time means that 90% of failures are noise, not signal. Flakiness is worse than the bug it was supposed to catch.
- **Treating production deploys as the safe moment.** If staging is not identical to production, staging tests are fiction. Real integration tests require real infrastructure — containers, networks, and state as they'll be in prod.
- **No rollback plan.** A one-way button that takes 30 minutes to undo is a trap. Every deploy must be reversible in <5 minutes.

## <span class="tpl">05</span>Interview Perspective

Design interviews want to hear "every commit hits the pipeline; tests must pass; it deploys to staging; canary for 5 min; if metrics are good, blue-green swap to prod." The depth signals are mentioning flakiness and how you'd fix it, naming the gates (build/test/deploy/smoke) and their purposes, and volunteering rollback strategy ("automated if metrics degrade, or manual in <5 minutes"). Behavioral interviews probe "how do you test a database change" — the expected answer involves staging with production data (or a safe copy), not just unit tests.

## <span class="tpl">06</span>Code / Pseudocode

```yaml
# .github/workflows/ci-cd.yml — the standard shape
name: CI/CD
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        options: >-
          --health-cmd pg_isready --health-interval 10s --health-timeout 5s
    steps:
      - uses: actions/checkout@v3
      - run: pip install -r requirements.txt
      - run: pytest tests/              # unit + integration, all fast
      - run: black --check . && ruff .  # style and lint
      - if: github.ref == 'refs/heads/main'
        run: docker build -t myapp:${{ github.sha }} .
      - if: github.ref == 'refs/heads/main'
        run: kubectl set image deployment/myapp myapp=myapp:${{ github.sha }} -n prod
      - if: github.ref == 'refs/heads/main'
        run: kubectl rollout status deployment/myapp -n prod
```

## <span class="tpl">07</span>Related Concepts

- **Testing** — the pipeline's gatekeeper.
- **Observability** — you deploy, then watch.
- **Progressive Delivery** — canaries and feature flags as the advanced form.
- **Software Quality** — static analysis as a pipeline gate.

**Source material:** *Continuous Delivery* (Humble & Farley) — the foundational book on why and how; the Google SRE Book chapter on release engineering; *Accelerate* (Forsgren, Humble, Kim) for the metrics (deployment frequency, lead time, mean time to recovery) that make the economic case.

</div>

<div class="pane pane-build">

## Build Tasks — Deployment & CI/CD

### Task 1 — Build a working pipeline
Set up GitHub Actions (or GitLab CI) that runs linting, unit tests, and integration tests on every push, building an artifact only on main branch.
- **Done when:** a commit to main builds an artifact; a failing test blocks the build.

### Task 2 — Deploy to a staging environment
Extend the pipeline to deploy the artifact to a staging cluster (or a separate pod in the same cluster) after tests pass.
- **Done when:** `git push && sleep 2m && curl https://staging.myapp.local/health` returns 200.

### Task 3 — Canary + rollback
Add a canary phase: deploy to 1 pod, wait 5 minutes, check if error rate < 0.5%, then roll out to all. Simulate a bad deploy (a 500 in the new version) and verify rollback.
- **Done when:** the canary detects the error and rolls back before reaching production.

### Task 4 — Zero-downtime staging migration
Change the staging database schema (add a column, backfill, switch reads). Verify the whole pipeline runs, staging is upgraded, and no health checks fail mid-deploy.
- **Done when:** the deploy runs without a single 5xx in the canary.

</div>
