---
title: 'Software Quality'
description: 'Quality is not perfection; it is predictability. A system you understand and trust degrades gradually, not suddenly.'
readingTime: 10
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Software quality is built on three habits, none of which require genius and all of which compound over a codebase's lifetime:

- **Code review** — every change seen by someone else before commit. Catches bugs, spreads knowledge, prevents cowboy deploys. Slows the pace by minutes; saves it by weeks when the reviewer spots a race condition or a schema mistake.
- **Static analysis** — linters, type checkers, formatters, security scanners. Automated checks for style, bugs, and anti-patterns. Cheap to run, removes the "please fix the formatting" round from review.
- **Incremental refactoring** — leaving the codebase cleaner than you found it. A small refactor per PR (one variable renamed, one function extracted, one dead code removed) compounds into a system that remains legible as it grows.

The opposite pathology is the "just ship it" culture: code lands without review, tests are optional, shortcuts accumulate, and the codebase becomes so tangled that each change risks everything — velocity *appears* to spike (no review), then plummets (fixes take forever).

<div class="concept-card">
<div class="cc-label">Core principle</div>

Quality scales with discipline, not talent. A mediocre engineer with review and tests will ship more reliable code than a brilliant one operating alone. The system, not the person, is the unit of analysis.

</div>

## <span class="tpl">02</span>Mental Model

A codebase is like **a garden**. A well-tended one — where weeds are pulled when small and dead branches removed — stays beautiful and productive. Neglected, it becomes overgrown, and the cost to restore it (rip it out and replant, or spend months with shears) exceeds the cost of never neglecting it. Review, linting, and incremental refactoring are the daily tending. The insight is that the cost of tending is nearly zero (a few hours a week) compared to the cost of jungle-clearing later.

## <span class="tpl">03</span>Real-World Example

**Two teams, one codebase.** Team A runs every PR through review and CI; they lint and format automatically; when they see dead code, they delete it. The codebase after a year feels legible, and a new engineer can ship a feature in a week. Team B says "we're in a hurry" and ships directly. The first six months are fast; by month nine, every change requires understanding three different approaches to the same problem, each with its own style. A new engineer is lost for two weeks. Team A is faster than Team B from month seven onward, and Team A's engineers want to stay; Team B's are job-searching. Quality is not slow — it's fast, with a startup cost.

## <span class="tpl">04</span>Common Mistakes

- **Review as a gate, not a conversation.** Reviewers rubber-stamp or nitpick style while missing logic. The goal is shared understanding and catching oversights.
- **Linters as busywork.** Running a linter then having humans fix every warning is theater. Configure linters to auto-fix; humans review the intent, not the formatting.
- **Accepting technical debt as inevitable.** It's not. Every shortcut has a compounding interest rate. Refactor proactively or pay exponentially later.
- **Code review on merged code.** "We'll clean it up later" is the developer's most expensive lie. Reviewing before merge is the only point where change is cheap.
- **Metrics without context.** Counting code reviews per day or static analysis violations without knowing *why* (is the warning real or noisy?) is measurement theater.

## <span class="tpl">05</span>Interview Perspective

Quality is not a flashy topic but a signal of maturity. In interviews, volunteering a review practice ("every PR requires at least one approval before merge") and naming what you check for (does this function do one thing, is this SQL tested, will this scale to 10M rows) shows judgment. The distinction between "auto-fix obvious stuff and review the intent" vs "review every formatting choice" is a senior move. Mentioning incremental refactoring (small daily improvements, not monolithic rewrites) signals a systems-thinking mindset.

## <span class="tpl">06</span>Code / Pseudocode

```python
# Three-pillar quality: review checklist + auto-fixes + refactor increments.

# REVIEW CHECKLIST (what to look for)
# Does this change:
# - Have tests? (unit if logic, integration if state/SQL)
# - Follow the architecture boundary rule? (domains depend on nothing)
# - Create n+1 queries? (check EXPLAIN ANALYZE on new queries)
# - Have timeouts? (every network call)
# - Propagate correlation IDs? (every log line has context)
# - Break any SLOs? (check the service's SLA-bound path)

# STATIC ANALYSIS (pyproject.toml)
[tool.ruff]
line-length = 100
select = ["E", "F", "W", "I", "UP"]  # errors, unused, warnings, imports, upgrades

[tool.black]
line-length = 100

[tool.mypy]
strict = true

# Every push gets these for free; humans never argue about formatting.

# INCREMENTAL REFACTORING (one per PR, accumulated over months)
# If you see: unused import, dead code, long function, duplicate
# → fix it while you're here (add to the PR, no extra commit)
```

## <span class="tpl">07</span>Related Concepts

- **Testing** — the other pillar of confidence.
- **Backend Architecture** — clean structure makes review easier.
- **Evolutionary Code & Refactoring** — where incremental improvement becomes strategy.

**Source material:** *The Pragmatic Programmer* (Hunt & Thomas) for the daily discipline mindset; *Code Review Best Practices* (Steinmacher et al.) for review science; the Google Engineering Practices guide on code review.

</div>

<div class="pane pane-build">

## Build Tasks — Software Quality

### Task 1 — Enforce review
Set up GitHub branch protection: require one approval + status checks passing before merge.
- **Done when:** you can't merge without someone else signing off.

### Task 2 — Configure linters + auto-fix
Add ruff, black, mypy to your project with `--fix` in CI; verify they auto-format and catch real errors (undefined variables, unused imports).
- **Done when:** `git push` triggers auto-format and you can't merge if type checks fail.

### Task 3 — Write a review checklist
Document five things code reviewers should always check (tests, architecture boundaries, N+1 queries, timeouts, logging). Post it in your project's CONTRIBUTING.md.
- **Done when:** the checklist is specific to your stack and in use in one PR.

### Task 4 — One refactor per week
Pick a real project. Every week for four weeks, make one small refactor (extract function, remove unused code, rename for clarity). Document each and verify tests pass.
- **Done when:** the codebase visibly improves and tests still pass.

</div>
