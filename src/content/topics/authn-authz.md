---
title: 'Authentication & Authorization'
description: 'Authentication is who you are; authorization is what you may do. Conflating them, or rolling your own, is how breaches happen.'
readingTime: 12
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Two distinct problems wear one acronym. **Authentication (AuthN)** establishes identity: are you who you claim? **Authorization (AuthZ)** governs permission: may this identity perform this action on this resource? They fail differently — bad AuthN lets strangers in; bad AuthZ lets insiders reach things they shouldn't (the most common and most under-tested vulnerability class, "broken access control," tops the OWASP list).

The building blocks:

- **Credentials & sessions** — passwords (hashed with bcrypt/argon2, never encrypted, never plain), then a session token or JWT carrying the established identity.
- **Token models** — opaque session tokens (server looks up state — easy revocation, a lookup per request) vs **JWTs** (self-contained, signed claims — no lookup, but revocation is hard and a leaked token is valid until expiry).
- **Delegated auth — OAuth 2.0 / OIDC** — "log in with Google": OAuth authorizes access to resources, OIDC adds an identity layer on top. You receive tokens; you never touch the user's password.
- **Permission models** — RBAC (roles → permissions), ABAC (attributes/policies), ReBAC (relationship graphs, à la Google Zanzibar). Start with RBAC; reach for the others only when roles can't express the rules.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Authorize at the point of use, on every request, against the *resource* — never trust that because a user reached a handler, they may act on the specific object it touches. "Can edit documents" and "can edit *this* document" are different checks.

</div>

## <span class="tpl">02</span>Mental Model

AuthN is the **passport check at the border**: it proves identity, once, and stamps you in. AuthZ is the **set of keycards** that open specific doors inside the building — and a guard at every door, not just the lobby. The classic breach is checking the passport at the lobby and assuming anyone in the hallway belongs at any door. A JWT is a **tamper-evident wristband**: anyone can read it, the signature proves the venue issued it, but once issued you can't easily un-issue it — so you keep its lifetime short and keep a revocation list for the rare cases that matter.

## <span class="tpl">03</span>Real-World Example

**A multi-tenant SaaS API** illustrates the trap. AuthN is solid: OIDC via the identity provider, short-lived JWT in an httpOnly cookie. The vulnerability hides in AuthZ: `GET /documents/{id}` validates the token (you're a real, logged-in user) and returns the document — but never checks that the document belongs to *your* tenant. Changing the ID in the URL reads another company's data. This is **IDOR / broken object-level authorization**, and it's behind a large share of real-world API breaches. The fix is a resource-scoped check on every handler: `WHERE id = $1 AND tenant_id = $2`, so authorization is enforced in the same query that fetches the data and can't be forgotten separately.

## <span class="tpl">04</span>Common Mistakes

- **Rolling your own crypto or session logic.** Use vetted libraries and an identity provider. Hand-rolled password resets, "remember me" tokens, and JWT verification are breach factories.
- **Authorizing by route, not by resource.** Middleware that checks "is logged in" or "is admin" but never "owns this specific object" — the IDOR pattern above.
- **JWTs as sessions without a revocation plan.** Logout that just deletes the client cookie leaves a valid token in an attacker's hands until expiry. Keep tokens short-lived; use refresh tokens; maintain a denylist for forced revocation.
- **Storing secrets client-side or in localStorage.** Tokens in `localStorage` are readable by any XSS; httpOnly cookies (plus CSRF protection) are the safer default.
- **Leaking existence through errors.** "User not found" vs "wrong password" tells an attacker which emails are registered. Return the same response for both.

## <span class="tpl">05</span>Interview Perspective

Design interviews want the flow named correctly: "AuthN via OIDC issuing a short-lived JWT; AuthZ enforced per-request at the resource level with RBAC." The depth signal is volunteering the trade-off — *"JWTs avoid a session lookup but make revocation hard, so I keep them to 15 minutes with refresh tokens, and use a denylist for immediate revocation."* Security-leaning interviews probe IDOR directly ("a user changes the ID in the URL — what stops them?") and password storage ("hash, not encrypt; argon2id; never log it"). For permission models, show you scale from RBAC to ReBAC by need, not by default.

## <span class="tpl">06</span>Code / Pseudocode

```python
# AuthN: verify identity (the wristband). AuthZ: verify permission on THIS resource.

async def get_current_user(token: str = Depends(oauth2)) -> User:
    try:
        claims = jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")          # AuthN failure
    if await redis.sismember("jwt:denylist", claims["jti"]):
        raise HTTPException(401, "Token revoked")
    return User(id=claims["sub"], tenant_id=claims["tenant"], roles=claims["roles"])

@router.get("/documents/{doc_id}")
async def read_doc(doc_id: UUID, user: User = Depends(get_current_user)):
    # AuthZ enforced IN the fetch — scoped to the caller's tenant.
    doc = await db.fetch_one(
        "SELECT * FROM documents WHERE id = $1 AND tenant_id = $2",
        doc_id, user.tenant_id,
    )
    if doc is None:
        raise HTTPException(404)        # same response whether missing or forbidden
    return doc
```

## <span class="tpl">07</span>Related Concepts

- **API Design** — auth is part of every API's contract (scopes, status codes).
- **Threat Modeling** — systematically finding the AuthZ gaps above.
- **Zero Trust Architecture** — authorize every request everywhere, no trusted network.
- **State Management** — sessions are owned ephemeral state.

**Source material:** OWASP Top 10 (esp. A01 Broken Access Control) and the OWASP Authentication Cheat Sheet — the practical canon; *OAuth 2 in Action* (Richer & Sanso) for delegated auth; the Google Zanzibar paper for ReBAC at scale.

</div>

<div class="pane pane-build">

## Build Tasks — Authentication & Authorization

### Task 1 — Sessions vs JWT, both correctly
Implement login two ways: opaque Redis session token, and signed JWT. For each, implement logout that *actually* revokes access.
- **Done when:** for both, a logged-out token is rejected on the next request — and you can articulate the revocation cost difference.

### Task 2 — Find and fix an IDOR
Build `GET /documents/{id}` *with* the vulnerability (token check only), prove you can read another user's doc by changing the ID, then fix it with a resource-scoped query.
- **Done when:** the exploit works before the fix and 404s after, with a test asserting both.

### Task 3 — RBAC, then a relationship rule
Add roles (viewer/editor/admin) enforced per endpoint. Then add one rule roles can't express ("can edit docs *they created*") and implement it.
- **Done when:** you can state why the second rule pushed you past pure RBAC toward attributes/relationships.

</div>
