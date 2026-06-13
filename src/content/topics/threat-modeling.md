---
title: 'Threat Modeling'
description: 'Security is not a feature; it is a side effect of thinking like an attacker. Threat modeling makes that habit systematic.'
readingTime: 10
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Threat modeling is the discipline of systematically identifying what can go wrong and designing to prevent it. The mindset is adversarial: instead of "how will this be used," it is "how will this be attacked." The standard approach is STRIDE, which catalogs threat types:

- **Spoofing** — claiming to be someone you're not (identity attacks).
- **Tampering** — modifying data or code in transit or at rest.
- **Repudiation** — denying that you did something (no audit trail).
- **Information Disclosure** — exposing secret data.
- **Denial of Service** — making the system unavailable.
- **Elevation of Privilege** — gaining permissions you shouldn't have.

For each component in the system, you ask: which of these can happen here? What is the impact? What mitigates it? The outputs are architectural decisions (we need mTLS here to prevent spoofing) and requirements (all writes go through an audit log to prevent repudiation).

<div class="concept-card">
<div class="cc-label">Core principle</div>

Threat modeling is cheaper than incident response. An hour thinking like an attacker can prevent the equivalent of a week of chaos and a breached customer database.

</div>

## <span class="tpl">02</span>Mental Model

A bank's security model. Tellers (components) authenticate customers (spoofing protection). Safes are locked (tampering protection). Transactions are logged (repudiation protection). Cash is guarded (denial of service protection). A customer can't access others' accounts (elevation of privilege protection). Each protection is designed for a threat category.

## <span class="tpl">03</span>Real-World Example

**A multi-tenant SaaS platform.** Threat model surfaces: "one tenant's API key could be stolen (spoofing/elevation); they could then access another tenant's data (information disclosure/elevation). Mitigations: rotate keys frequently (reduce exposure window), scope keys to specific resources (elevation limit), log all API usage (repudiation), use mTLS (spoofing)." The threat model guides architecture; a naive "everyone has one key" becomes "every API call is scoped; unknown tenants are rejected; unusual patterns alert ops."

## <span class="tpl">04</span>Common Mistakes

- **Threat modeling as a one-time event.** Systems change; threats change. Re-threat-model every major change.
- **Only protecting the obvious.** Most breaches exploit non-obvious paths (the admin dashboard wasn't intended as user-facing; it had no rate limiting; an attacker enumerated admin IDs).
- **Focusing on secrecy instead of authentication and auditability.** The thing that matters is "who did this," not "no one sees this." Audit logs are more important than encryption for most threats.
- **No accountability.** Even if you prevent spoofing, without an audit log, who was it? Build repudiation resistance.

## <span class="tpl">05</span>Interview Perspective

Threat modeling is a hired signal in security-aware roles. The strong answer: "I start with STRIDE, identify assets and trust boundaries, ask 'who benefits from attacking this' and 'what is the impact,' then design controls." Mentioning specific mitigations (mTLS, audit logs, rate limiting) for specific threats shows rigor. The antipattern: "we'll add security later" — it is like structural engineering; the foundation decides what is possible upward.

## <span class="tpl">06</span>Code / Pseudocode

```python
# Threat model excerpt: API endpoint access.
# Threats: Spoofing (fake auth), Elevation (wrong tenant), Information Disclosure (leaks)
# Mitigations in code:

@app.get("/documents/{doc_id}")
async def get_document(doc_id: UUID, user = Depends(verify_jwt_strict)):
    # SPOOFING mitigation: verify JWT signature + expiry
    # ELEVATION mitigation: check tenant_id matches user's tenant
    doc = await db.fetch_one(
        "SELECT * FROM documents WHERE id = $1 AND tenant_id = $2",
        doc_id, user.tenant_id,  # scope to tenant
    )
    if doc is None:
        # REPUDIATION mitigation: log ALL access, success or failure
        await audit_log(user.id, "GET /documents", doc_id, "403 Forbidden")
        raise HTTPException(403)  # same response for missing or forbidden
    
    await audit_log(user.id, "GET /documents", doc_id, "200")
    return doc

# ELEVATION + INFORMATION DISCLOSURE check: rate limit by tenant
# so one tenant's quota doesn't impact another's (denial of service isolation)
```

## <span class="tpl">07</span>Related Concepts

- **Authentication & Authorization** — the two most direct mitigations.
- **Zero Trust Architecture** — threat modeling applied to the whole system.

**Source material:** OWASP threat modeling guide; Microsoft's STRIDE card game (free); *Threat Modeling* (Shostack) for the methodology.

</div>

<div class="pane pane-build">

## Build Tasks — Threat Modeling

### Task 1 — STRIDE a service
Pick a service. For each STRIDE category, list one threat and its mitigation. Document it.
- **Done when:** you have six threats, six mitigations, and a diagram of trust boundaries.

### Task 2 — Implement a mitigation
Pick the highest-impact threat. Implement its mitigation (audit logging, input validation, rate limiting, scope checks).
- **Done when:** the mitigation is tested and documented.

### Task 3 — Threat review on change
When adding a new endpoint or feature, ask STRIDE questions. Confirm mitigations are in place.
- **Done when:** threat modeling is part of your code review checklist.

</div>
