---
title: 'Networking Fundamentals'
description: 'Every request is a journey through DNS, TCP, TLS, and HTTP. Engineers who can narrate that journey can debug anything between two machines.'
readingTime: 11
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Backend engineering is moving bytes between machines that don't trust each other and a network that drops, delays, duplicates, and reorders them. The stack that tames this — IP (addressing), TCP (reliable ordered streams), TLS (encryption + identity), DNS (names), HTTP (request semantics) — is the substrate of every API call, database query, and queue message you'll ever make.

What matters operationally is the **cost structure**: a brand-new HTTPS connection pays DNS (~10–50ms uncached) + TCP handshake (1 RTT) + TLS handshake (1–2 RTTs) before a single application byte moves. On a 50ms RTT link that's ~150ms of pure ceremony. This single fact explains connection pooling, keep-alive, HTTP/2 multiplexing, CDNs (move the RTT closer), and why "just make another HTTP call" inside a hot loop is an architecture decision, not a code style choice.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Connections are expensive to open and cheap to keep. Most networking "best practices" — pooling, keep-alive, multiplexing, regional affinity — are one idea: amortize the handshake.

</div>

## <span class="tpl">02</span>Mental Model

Think of layers as **envelopes inside envelopes**: your JSON sits inside an HTTP message, inside a TLS record, inside TCP segments, inside IP packets, inside Ethernet frames. Each layer solves one problem and is blind to the others — IP gets packets to a machine, TCP turns unreliable packets into a reliable byte stream, TLS makes the stream private and authenticated, HTTP gives the bytes meaning. Debugging is identifying *which envelope* is failing: connection refused (TCP — nothing listening), certificate error (TLS), 404 (HTTP), name not found (DNS). Four different failures, four different teams to page.

The other load-bearing intuition: **bandwidth is how wide the pipe is; latency is how long the pipe is.** You can buy bandwidth; latency is bounded by the speed of light. Mumbai→Virginia and back is ~180ms no matter your budget — which is why replication and edge presence exist.

## <span class="tpl">03</span>Real-World Example

**A payment confirmation from a Dhaka user to a US-hosted API:** the browser resolves the domain via DNS (answered by a nearby resolver cache in ~5ms, or a full recursive lookup in ~80ms), opens TCP+TLS to a CDN edge in Singapore (~60ms RTT instead of ~220ms to Virginia), the CDN holds a pre-warmed connection pool to origin over its private backbone, and origin's load balancer terminates TLS once more before handing plain HTTP to your FastAPI pod. Five round trips that *would* have crossed the planet now cross a city. Meanwhile, your service's outbound calls reuse pooled connections (httpx/aiohttp pools) for exactly the same reason — every layer of the modern stack is handshake amortization plus RTT reduction.

## <span class="tpl">04</span>Common Mistakes

- **Creating a client per request.** `httpx.AsyncClient()` inside a handler opens (and leaks) a connection pool per call. One client per process, injected as a dependency.
- **No timeouts.** The default for many clients is *infinite*. A hung upstream then hangs your worker, then your service, then your callers — the classic cascading failure. Every network call gets connect + read timeouts, always.
- **Ignoring DNS as a moving part.** DNS has TTLs, caches, and outages; a "service is down" incident is sometimes "DNS change hasn't propagated" or "resolver is slow." Also: long-lived connections survive DNS changes — that pooled connection may still point at a dead IP.
- **Assuming the network inside a datacenter is reliable.** It is *less* unreliable, not reliable — this assumption is the first Fallacy of Distributed Computing.

## <span class="tpl">05</span>Interview Perspective

"What happens when you type a URL and press Enter" remains the standard probe; the differentiator is narrating costs, not steps — name the RTT count and where caching short-circuits each step. In system design, networking shows up as: choosing where TLS terminates, why you put a CDN in front of static assets, connection pooling between services, and the latency budget ("user→edge 30ms, edge→origin 80ms, that leaves 90ms of compute for a 200ms SLA"). Mentioning that you size pools and set timeouts deliberately signals production experience.

## <span class="tpl">06</span>Code / Pseudocode

```python
# One pooled client per process, timeouts on everything. This is 80% of
# "networking best practice" in application code.
import httpx

client = httpx.AsyncClient(
    timeout=httpx.Timeout(connect=2.0, read=5.0, write=5.0, pool=2.0),
    limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
)

async def get_rates():
    # reuses a warm TCP+TLS connection: ~1 RTT instead of ~4
    r = await client.get("https://api.rates.example/v1/usd-bdt")
    r.raise_for_status()
    return r.json()
```

## <span class="tpl">07</span>Related Concepts

- **API Design** — the semantics riding on top of this transport.
- **Caching & Performance** — CDNs and HTTP caching are networking-layer caches.
- **Fallacies of Distributed Computing** — what breaks when you forget this topic.
- **Error Handling & Resilience** — timeouts and retries are the application's answer to packet loss.

**Source material:** *High Performance Browser Networking* (Grigorik, free online) — the chapters on TCP, TLS, and HTTP/2 are the best practical treatment anywhere; *Computer Networking: A Top-Down Approach* (Kurose & Ross) for the full stack.

</div>

<div class="pane pane-build">

## Build Tasks — Networking Fundamentals

### Task 1 — Dissect a request
Use `curl -v --trace-time` against an HTTPS API and annotate every line: DNS, TCP connect, TLS handshake, request, response. Repeat with `--resolve` to skip DNS and with keep-alive (two requests, one connection).
- **Done when:** you can attribute milliseconds to each phase and show the handshake disappearing on request two.

### Task 2 — Pool vs no pool
Write two scripts hitting your own API 500 times: one creating a client per request, one sharing a pooled client. Measure wall time and count connections with `ss -tan | wc -l` during each run.
- **Done when:** you have the numbers and a two-sentence explanation.

### Task 3 — Break it on purpose
Point a request at a blackhole IP (e.g. a firewalled port) with no timeout, watch it hang; add timeouts and watch it fail fast. Then kill DNS (bogus resolver) and identify the distinct error.
- **Done when:** you can tell apart DNS failure, connect timeout, read timeout, and connection refused from the exception alone.

</div>
