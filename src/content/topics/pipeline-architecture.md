---
title: 'Pipeline Architecture'
description: 'Stages, gates, and artifacts: pipelines are production software, designed as carefully as the code they deploy.'
readingTime: 11
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

A CI/CD pipeline is not a script that runs in order. It is a system: artifacts flow through stages (build, test, stage, prod), decisions are made at gates (tests must pass, code review approved), and state persists between stages (the built artifact is what goes to prod, not a fresh checkout). Designing a pipeline means making the same architectural choices as designing any system: what flows through, where do gates happen, what happens on failure, what is the rollback path.

The stages flow the artifact, not the code. Build once, test that artifact, deploy that artifact — never rebuild. This ensures what you tested is what you deploy, eliminating the "works in CI but fails in prod" class of failures.

<div class="concept-card">
<div class="cc-label">Core principle</div>

The artifact is immutable. Build once. Test that artifact. Deploy that artifact. Never rebuild between stages.

</div>

## <span class="tpl">02</span>Mental Model

A factory assembly line. Raw materials (code) are processed once (built) into a product (artifact). The product moves through quality gates (tests). At each gate, if defects are found, the product is rejected; if not, it moves forward. The same product reaches the customer; it was never reassembled. Contrast with rebuilding at each stage — and you might rebuild it slightly differently, introducing bugs.

## <span class="tpl">03</span>Real-World Example

**GitHub Actions with Docker artifacts.** Push to main; GitHub Actions builds a Docker image and pushes it to a registry with the commit SHA as the tag. Tests pull that exact image. Staging deployment pulls that image. Prod canary pulls that image. If a security scanner finds a vulnerability, the tag is blocked at the prod gate; older commits' images still flow. The image never changes between stages; failures are reproducible.

## <span class="tpl">04</span>Common Mistakes

- **Rebuilding between stages.** "Build in CI, rebuild in stage to test" introduces uncertainty; different code paths may run.
- **No clear artifact definition.** Is it the git commit? The built binary? The container image? Ambiguity causes deployment bugs.
- **Gates that are easy to bypass.** "Manually approve this in Slack" or "run tests locally and upload the result" are not gates — they're speed bumps for discipline.
- **No rollback path.** A pipeline with no "go back to last good version" is a trap: you're always moving forward into the bad.

## <span class="tpl">05</span>Interview Perspective

Pipeline architecture is less commonly asked but signals ownership mentality. The strong answer: "Every commit builds an immutable artifact, tests it, deploys it progressively, and can roll back to the last one. The pipeline gates quality — if tests fail, nothing proceeds." Mentioning artifact immutability and that the tested artifact is what reaches prod shows architectural thinking.

## <span class="tpl">06</span>Code / Pseudocode

```yaml
# GitHub Actions pipeline: build once, test that artifact, deploy it
name: CI/CD
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: docker build -t myapp:${{ github.sha }} .
      - run: docker push myapp:${{ github.sha }}  # immutable artifact
      # Store the image SHA for later jobs
      - run: echo "${{ github.sha }}" > artifact.txt
      - uses: actions/upload-artifact@v3
        with:
          name: artifact
          path: artifact.txt

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v3
      - run: |
          ARTIFACT=$(cat artifact.txt)
          docker run myapp:$ARTIFACT npm test  # test THE artifact, not rebuilt

  deploy-staging:
    needs: [build, test]
    if: github.ref == 'refs/heads/main'  # gate: only from main
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v3
      - run: |
          ARTIFACT=$(cat artifact.txt)
          kubectl set image deployment/myapp myapp=myapp:$ARTIFACT -n staging

  deploy-prod:
    needs: [build, test, deploy-staging]  # gate: staging must succeed
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v3
      - run: |
          ARTIFACT=$(cat artifact.txt)
          # Canary: wait for metrics
          kubectl set image deployment/myapp myapp=myapp:$ARTIFACT -n prod --record
          # Rollback if needed
          kubectl rollout status deployment/myapp -n prod --timeout=5m || \
            kubectl rollout undo deployment/myapp -n prod
```

## <span class="tpl">07</span>Related Concepts

- **Deployment & CI/CD** — the operational expression of pipeline thinking.
- **Testing** — gates in the pipeline.
- **Progressive Delivery** — the canary stage of a pipeline.

**Source material:** *Continuous Delivery* (Humble & Farley) for the complete treatment; Google's *Deploying with Confidence* article on artifact immutability.

</div>

<div class="pane pane-build">

## Build Tasks — Pipeline Architecture

### Task 1 — Build once, test it
Set up a pipeline that builds an artifact once and tests that artifact, not a fresh checkout.
- **Done when:** you can verify the tested artifact is what deploys.

### Task 2 — Immutable artifact
Tag the artifact with a commit SHA or build ID. Show that the tag never changes between stages.
- **Done when:** the artifact is traceable end-to-end.

### Task 3 — Rollback path
Add a rollback stage: if prod metrics degrade, automatically switch back to the previous artifact.
- **Done when:** rollback is faster than rolling forward and fully automatic.

</div>
