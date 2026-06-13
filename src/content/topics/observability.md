---
title: 'Observability'
description: 'Monitoring tells you the system is broken; observability lets you ask why — without shipping new code to find out.'
readingTime: 11
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Observability is the property of being able to understand a system's internal state from its external outputs — to answer questions you didn't anticipate when you wrote it. The distinction from monitoring matters: **monitoring** watches known failure modes (CPU > 80%, error rate > 1%); **observability** lets you debug *unknown* ones ("why are requests from this one tenant slow only on Tuesdays?") without redeploying. As systems become distributed, the failures stop being "is it up" and become "which of forty services added the latency," and only observability answers that.

The three pillars, each answering a different question:

- **Metrics** — cheap, aggregated numbers over time (request rate, error rate, p99 latency). Answer *"is something wrong, and how bad?"* Great for alerting and dashboards; can't explain a single weird request.
- **Logs** — discrete, timestamped events with context. Answer *"what exactly happened in this case?"* Structured (JSON, queryable) beats free-text; correlation IDs tie a request's logs across services.
- **Traces** — the path of one request across all services, with timing per hop. Answer *"where did the time go?"* The only pillar that makes distributed latency legible.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Instrument for the question you'll ask at 3 a.m., not the metric that's easy to emit. The test of observability is whether a *novel* problem can be diagnosed from existing telemetry — if every incident needs a new log line shipped to prod, you have monitoring, not observability.

</div>

## <span class="tpl">02</span>Mental Model

Think of debugging a distributed system as **investigating an incident across a city**. Metrics are the city's aggregate dashboards — traffic volume, average speed per district — they tell you *something is congested downtown* but not *which intersection*. Traces are GPS breadcrumbs following *one specific car* through every intersection, with a timestamp at each — now you see it sat 90 seconds at one light. Logs are the detailed notes at each location — *why* that light failed. You triage with metrics (what and how bad), localize with traces (where), and root-cause with logs (why). Skipping straight to logs in a 40-service system is reading every street camera's footage hoping to spot the car.

## <span class="tpl">03</span>Real-World Example

**A latency regression after a deploy.** The metrics dashboard fires: p99 on `/checkout` jumped from 200ms to 1.4s, error rate steady. Metrics say *what* (slow, not erroring) and *how bad* but not *where* — checkout fans out to six services. The engineer opens a trace for a slow request: the waterfall shows five hops at their normal timing and one — the pricing service's call to a new currency API — taking 1.1s. Localized. They filter that service's structured logs by the request's correlation ID and find the new dependency has no cache and no timeout. Root-caused in minutes, not hours, because the three pillars composed: metric → trace → log, broad to narrow. The correlation ID threading the whole request is what made the log filter possible.

## <span class="tpl">04</span>Common Mistakes

- **Logging everything, structuring nothing.** Gigabytes of free-text logs you can't query are a cost center, not a tool. Log structured (JSON), at the right level, with a correlation ID on every line.
- **Averages instead of percentiles.** Mean latency hides the tail; your worst-affected users live in the p99. Alert and design on p95/p99, not averages — *"the average is fine"* while 1% suffer is a real outage to them.
- **No correlation/trace IDs.** Without an ID propagated through every hop, distributed logs are unjoinable and traces impossible.
- **Alerting on causes, not symptoms.** Paging on "CPU high" creates noise (high CPU is often fine); page on *symptoms users feel* — error rate, latency SLO burn. The SRE framing: alert on the four golden signals (latency, traffic, errors, saturation).
- **Cardinality blindness.** Tagging metrics with unbounded labels (user ID, request ID) explodes storage and cost. High cardinality belongs in traces/logs, not metric labels.

## <span class="tpl">05</span>Interview Perspective

Observability appears as the "how do you operate this" act of a design interview, and the signal is naming the three pillars by their *job*: "metrics for alerting on golden signals, traces for cross-service latency, structured logs with correlation IDs for root cause." Strong candidates volunteer percentile thinking ("I alert on p99 latency and error budget burn, not averages") and mention propagating a trace context across service boundaries (OpenTelemetry). The classic question — "a request is slow, walk me through debugging" — is answered with the metric→trace→log narrowing above. Mentioning SLOs and error budgets connects observability to reliability as a managed quantity.

## <span class="tpl">06</span>Code / Pseudocode

```python
# Structured logging + correlation ID propagation: the cheapest high-leverage
# observability you can add. (OpenTelemetry does traces; this does the logs.)
import contextvars, json, logging, uuid

request_id = contextvars.ContextVar("request_id", default="-")

class JsonFormatter(logging.Formatter):
    def format(self, r):
        return json.dumps({
            "ts": self.formatTime(r), "level": r.levelname,
            "msg": r.getMessage(), "request_id": request_id.get(),
            "service": "checkout",
        })

@app.middleware("http")
async def correlate(request, call_next):
    rid = request.headers.get("x-request-id", str(uuid.uuid4()))
    request_id.set(rid)                       # now EVERY log line in this request carries rid
    resp = await call_next(request)
    resp.headers["x-request-id"] = rid        # propagate downstream + back to caller
    return resp

# emit metrics on the golden signals (pseudo-Prometheus)
REQUEST_LATENCY.labels(endpoint="/checkout").observe(duration)   # histogram → p99
REQUEST_ERRORS.labels(endpoint="/checkout", code=resp.status).inc()
```

## <span class="tpl">07</span>Related Concepts

- **Backend Architecture** — clean boundaries make per-component telemetry meaningful.
- **Error Handling & Resilience** — you tune timeouts and breakers from observed data.
- **Progressive Delivery** — canaries are observability-gated deploys; bad signals trigger rollback.
- **Deployment & CI/CD** — telemetry is how you know a deploy is healthy.

**Source material:** *Observability Engineering* (Majors, Fong-Jones, Miranda) for the modern definition and the "unknown-unknowns" framing; the Google SRE Book chapters on monitoring, the four golden signals, and SLOs/error budgets.

</div>

<div class="pane pane-build">

## Build Tasks — Observability

### Task 1 — Correlation IDs end to end
Add structured JSON logging with a request ID propagated through two of your services (service A calls B, passes the ID, B logs it).
- **Done when:** one grep/filter on a request ID returns the full story across both services.

### Task 2 — Percentiles, not averages
Instrument an endpoint with a latency histogram. Add an artificial slow path for 1% of requests. Show that the average looks fine while p99 reveals the problem.
- **Done when:** your dashboard shows p50/p95/p99 and the 1% tail is visible only in p99.

### Task 3 — Trace a fan-out
Add OpenTelemetry (or a manual span timer) to a request that calls three downstreams; render the waterfall. Make one downstream slow and identify it from the trace alone.
- **Done when:** you localize the slow hop without reading any logs.

### Task 4 — Symptom-based alert
Write one alert rule on an SLO (e.g. p99 < 300ms or error rate < 0.5%) rather than on CPU. Trigger it with load.
- **Done when:** the alert fires on user-visible degradation and stays quiet during harmless CPU spikes.

</div>
