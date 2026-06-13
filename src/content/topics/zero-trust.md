---
title: 'Zero Trust Architecture'
description: 'Never trust the network, never trust the perimeter. Verify every request, everywhere, every time as if it came from the internet.'
readingTime: 10
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Traditional security has a perimeter: behind the firewall is "trusted," outside is "untrusted." Zero trust eliminates this. Every request is treated as untrusted: verify identity, check permissions, enforce encryption, audit the access. A request from inside the company network is no more trusted than one from the internet. This sounds paranoid; it is defensive.

The shift changes architecture: no "private" services (all service-to-service calls are mTLS + auth). Every service authenticates callers (via JWT or mTLS client certificates). All traffic, even internal, is encrypted. Access is granted to specific resources for specific identities, regardless of where they call from. A developer's laptop compromised? They can't access production because the service checks *their* identity + their *context* (do they have a VPN session, is the laptop trusted, is the access reasonable?).

<div class="concept-card">
<div class="cc-label">Core principle</div>

Trust is a liability. Every trust relationship is a failure mode: if A trusts B and B is compromised, A is compromised. Zero trust minimizes trust relationships by verifying everything, everywhere.

</div>

## <span class="tpl">02</span>Mental Model

A bank where the security guard checks ID not just at the front door, but at every floor, every vault, every teller window. Someone stole a guard's uniform? It doesn't matter; the vault still checks ID. A contractor's badge was cloned? They can't access anything outside their specific assigned areas.

## <span class="tpl">03</span>Real-World Example

**A cloud provider's internal architecture.** Services don't trust that a request came from "inside the cloud." Every service-to-service call is mTLS + service identity verified. A machine is compromised and tries to read another service's data? The target service checks the caller's certificate and permissions; the compromise is contained to one service. Logs show *which* service made the call and when, providing an audit trail. An engineer's credentials are leaked? They can't access production without a second factor *and* approval from an on-call engineer, and every access is logged.

## <span class="tpl">04</span>Common Mistakes

- **Thinking zero trust is only perimeter security.** It's not about firewalls; it's about eliminating implicit trust everywhere.
- **Implementing zero trust without strong identity.** If you can't reliably identify who (or what service) is making a request, zero trust is impossible.
- **Adding zero trust incrementally without breaking old assumptions.** Code that assumes "anything inside the VPN is trusted" must be rewritten; half-measures fail.
- **Audit logs that disappear.** Zero trust requires accountability; losing logs defeats the purpose.

## <span class="tpl">05</span>Interview Perspective

Zero trust is increasingly expected in security-conscious roles. The strong answer: "Every request is authenticated (JWT or mTLS); every access is to a specific resource with least privileges; service-to-service calls are mTLS + identity verification; all access is logged and monitored." Mentioning that this applies to *internal* traffic too, and that identity is per-service, not per-network, signals understanding.

## <span class="tpl">06</span>Code / Pseudocode

```python
# Zero Trust: verify identity and permissions on every request

# Middleware: all requests must be authenticated
@app.middleware("http")
async def verify_request(request, call_next):
    # Extract and verify identity
    cert = request.headers.get("x-client-cert")
    if not cert:
        raise HTTPException(401, "Missing client certificate")
    
    identity = verify_certificate(cert)  # mTLS verification
    context = VerificationContext(
        identity=identity,
        source_ip=request.client.host,
        timestamp=time.time(),
    )
    
    # Every handler will check permissions against context
    request.state.identity = identity
    request.state.context = context
    
    response = await call_next(request)
    return response

# Handler: authorize specific resources
@router.get("/documents/{doc_id}")
async def read_document(doc_id: UUID, request: Request):
    user_id = request.state.identity.id
    tenant_id = request.state.identity.tenant_id
    
    # CHECK: can this user access this document in this tenant?
    allowed = await authz.check(
        subject=user_id,
        action="read",
        resource=f"document:{doc_id}",
        context=request.state.context,
    )
    
    if not allowed:
        # Audit: log the denial
        await audit_log("DENIED", user_id, "read", doc_id, request.state.context)
        raise HTTPException(403)
    
    await audit_log("ALLOWED", user_id, "read", doc_id, request.state.context)
    return await db.fetch_one("SELECT * FROM documents WHERE id = $1", doc_id)
```

## <span class="tpl">07</span>Related Concepts

- **Threat Modeling** — zero trust is the architecture answer to many threats.
- **Authentication & Authorization** — the prerequisites for zero trust.
- **Observability** — audit logs are essential.

**Source material:** Google's "BeyondCorp" papers (zero trust in practice); NIST cybersecurity framework on zero trust; the CISA zero trust maturity model.

</div>

<div class="pane pane-build">

## Build Tasks — Zero Trust

### Task 1 — Implement mTLS for service-to-service
Set up two services with mutual TLS. Each must verify the other's certificate before accepting a request.
- **Done when:** an unauthorized service cannot make a request to an authorized service.

### Task 2 — Add identity-based access control
Add a step to verify the caller's identity and check permissions. Deny access if the caller doesn't have authorization.
- **Done when:** even authenticated services are denied if they lack specific permissions.

### Task 3 — Audit logging
Log every request (allowed and denied) with identity, timestamp, and resource. Show that an audit trail is complete.
- **Done when:** you can explain "at 2:34 PM on June 13, service X requested access to Y and was denied because Z."

</div>
