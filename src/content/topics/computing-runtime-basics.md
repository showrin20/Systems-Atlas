---
title: 'Computing & Runtime Basics'
description: 'Processes, threads, memory, and the event loop — the physics your code obeys whether you think about it or not.'
readingTime: 10
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Every backend abstraction — async/await, connection pools, containers, serverless — is a wrapper around four primitives: **processes** (isolated memory + at least one thread), **threads** (units of execution sharing a process's memory), **memory** (stack vs heap, virtual memory, the cache hierarchy), and **I/O** (the syscalls through which all network and disk work flows). When a service behaves strangely under load, the explanation is almost always here: a context-switch storm, a heap that outgrew RAM and began swapping, file descriptors exhausted, or a single thread doing what you assumed many were doing.

The numbers matter more than the definitions. A register access is sub-nanosecond; main memory ~100ns; an SSD read ~100µs; a same-region network round trip ~500µs–1ms; a cross-continent round trip ~150ms. That's six orders of magnitude — and it's why "the database call" dominates every latency budget and why caching works at all.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Performance intuition is just memorized latency ratios. An engineer who knows that one cross-region call costs the same as ~150,000 in-memory operations designs different systems than one who doesn't.

</div>

## <span class="tpl">02</span>Mental Model

A process is an **apartment**: its own address space (walls), one or more threads (occupants) who share everything inside, and syscalls as the only door to the outside world. Threads in the same apartment can pass things hand-to-hand instantly — and can also trip over each other (races). Separate processes must mail packages (IPC, sockets), which is slower but means one apartment burning down doesn't touch the others. Containers are apartments with the utilities metered (cgroups) and the hallway hidden (namespaces); they are *not* separate buildings — that's a VM.

The OS scheduler is the building manager with one rule: a thread waiting on I/O is parked (costing nothing but memory) and another runs. The entire async revolution is a response to the cost of that parking at 10k+ connections.

## <span class="tpl">03</span>Real-World Example

**Gunicorn/Uvicorn serving a FastAPI app** — the stack you deploy weekly — is a direct composition of these primitives: a master *process* forks N worker *processes* (isolation: one crashing worker doesn't kill the others; N ≈ cores because of Python's GIL), each worker runs an *event loop* on one thread multiplexing hundreds of connections, and `ulimit -n` plus the size of the connection pool quietly bound everything. Kubernetes memory limits are the same physics: exceed the cgroup limit and the OOM-killer SIGKILLs the process mid-request — which is why memory leaks in containers present as mysterious restarts, not slowdowns.

## <span class="tpl">04</span>Common Mistakes

- **Confusing concurrency mechanisms.** Threads for I/O-bound, processes for CPU-bound (in Python especially, because of the GIL), event loop for massive I/O concurrency. Choosing wrong wastes an order of magnitude.
- **Ignoring file descriptors.** Sockets, files, and pipes all consume FDs; the default limit (often 1024) is the first wall a busy service hits. "Too many open files" is a capacity bug, not a file bug.
- **Treating memory as infinite because it's virtual.** Once the working set exceeds RAM, paging turns memory access into disk access — a 1000× cliff that looks like a hang.
- **Assuming a container is a security or fault boundary like a VM.** Shared kernel; a kernel panic or noisy neighbor on the same node is your problem too.

## <span class="tpl">05</span>Interview Perspective

This is the layer interviewers probe with "what actually happens when…": *what happens when you type a URL*, *threads vs processes*, *why is Node single-threaded yet fast*. Strong answers use the cost numbers ("a context switch costs ~1–10µs, so 10k blocking threads burn real CPU just switching") and connect primitives to architecture ("we run one process per core, event loop inside — processes for the GIL, event loop for connection density").

## <span class="tpl">06</span>Code / Pseudocode

```python
# The three concurrency tools, chosen by workload — not by fashion.
import asyncio, concurrent.futures, multiprocessing

async def io_bound():            # thousands of these per thread
    await fetch_url(...)         # suspension point: loop runs others

def cpu_bound(data):             # GIL-immune only in a separate process
    return heavy_math(data)

async def main():
    # I/O: cheap concurrency on the loop
    pages = await asyncio.gather(*(io_bound() for _ in range(500)))

    # CPU: real parallelism via processes
    with concurrent.futures.ProcessPoolExecutor(multiprocessing.cpu_count()) as pool:
        results = await asyncio.get_running_loop().run_in_executor(pool, cpu_bound, pages)
```

## <span class="tpl">07</span>Related Concepts

- **Concurrency & Async Processing** — what to do with all that waiting.
- **Caching & Performance** — exploiting the latency hierarchy deliberately.
- **Cloud Compute Models** — VMs, containers, functions are packaging for these primitives.

**Source material:** *Operating Systems: Three Easy Pieces* (Arpaci-Dusseau, free online) — chapters on processes, scheduling, and memory virtualization; the "Latency Numbers Every Programmer Should Know" table; *Systems Performance* (Gregg) ch. 1–2 for the measurement mindset.

</div>

<div class="pane pane-build">

## Build Tasks — Computing & Runtime Basics

### Task 1 — Measure the hierarchy yourself
Write a script that times: summing 10M ints in memory, reading 100MB from disk (cold vs warm), one localhost HTTP round trip, one internet round trip. Plot the ratios.
- **Done when:** your measured ratios are within an order of magnitude of the canonical table and you can recite them.

### Task 2 — Watch the GIL
Run a CPU-heavy function (hashing in a loop) with 4 threads vs 4 processes; time both. Then run an I/O-heavy function (sleep-based mock) the same way.
- **Done when:** you can explain all four timings in two sentences each.

### Task 3 — Exhaust file descriptors
Lower `ulimit -n` to 64, open sockets in a loop against your FastAPI app until it fails, and observe the exact error and behavior.
- **Done when:** you can diagnose "too many open files" from symptoms alone and name two fixes (raise limit, pool/close connections).

</div>
