---
title: 'The Actor Model'
description: 'Actors are concurrent entities with no shared memory, communicating via messages. State and behavior are colocated; no races are possible.'
readingTime: 12
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

The actor model is a concurrent programming paradigm where the unit of computation is an **actor**: a lightweight entity with an identity, local state, and a mailbox. Actors process messages sequentially from their mailbox and can create new actors, send messages, and change behavior. The model eliminates shared-memory races entirely: state is local to an actor, and the only way to access another actor's state is to send a message and wait for a response.

The model is not new (Hewitt, 1973) but has become popular via frameworks like Akka (Java/Scala), Erlang/Elixir, and Orleans (C#/.NET). It is especially powerful for distributed systems because an actor can live on any machine; the message-passing semantics are identical locally or across the network.

<div class="concept-card">
<div class="cc-label">Core principle</div>

An actor is a unit of isolation. Its state is never shared; other actors can't corrupt it by accident. Concurrency is not a problem to manage; it is the default mode of the model.

</div>

## <span class="tpl">02</span>Mental Model

A department of workers, each with their own desk and tasks. They don't see each other's desks; they communicate only by email. Alice emails Bob with a request; Bob processes it, updates his own state, and emails back. No two people touch the same desk at the same time — no locking, no races, no deadlock.

## <span class="tpl">03</span>Real-World Example

**An Erlang system managing telecom switch state.** Millions of calls (actors), each with a state machine (initiating, ringing, connected, ending). When a call needs to notify the user or interact with another call, it sends messages. If a call actor crashes, the supervisor restarts it. The entire system is fault-tolerant by design: crashes are isolated, messages can be retried, and millions of actors run concurrently without locks. Contrast with a traditional multithreaded design: millions of threads (each costing memory), shared state (requiring locks), and a crash in one thread potentially bringing down others.

## <span class="tpl">04</span>Common Mistakes

- **Thinking actors are lighter-weight threads.** They are *much* lighter — Erlang runs millions of actors on modest hardware where you'd run thousands of threads.
- **Synchronous request-response patterns.** Actors are designed for asynchronous message passing. Forcing synchronous patterns negates the model's benefits.
- **Shared mutable state through messages.** Sending a reference to a mutable object defeats the point; send immutable data or copies.
- **Not understanding supervision.** A crashing actor is a feature, not a failure. The supervisor decides whether to restart, fail, or ignore.

## <span class="tpl">05</span>Interview Perspective

The actor model is less commonly asked in interviews but signals advanced concurrency thinking. The strong answer: "Actors eliminate shared-state races by design; state is local, all communication is via messages. Fault tolerance is implicit: a crash is isolated and can be supervised for recovery." Distinguishing from threads and mentioning distribution transparency (actors work the same on one machine or a cluster) shows depth.

## <span class="tpl">06</span>Code / Pseudocode

```scala
// Akka actor: a call handler managing call state
class CallActor(callId: String) extends Actor {
  private var state = "idle"
  
  override def receive: Receive = {
    case Initiate(targetPhone) =>
      state = "calling"
      // Send message to another actor, not a direct call
      targetActor ! Ring(callId, targetPhone)
    
    case RingAccepted =>
      state = "connected"
      sender() ! Connected()  // respond via message
    
    case EndCall =>
      state = "ended"
      // Clean up; actor will be stopped
      context.stop(self)
    
    case _ => // ignore unknown messages; don't crash
  }
}

// Supervision: if a child actor crashes, the supervisor decides
class CallSupervisor extends Actor {
  override val supervisorStrategy = OneForOneStrategy() {
    case _: CallCrashException => Restart  // restart the actor
    case _: Exception => Escalate  // propagate up
  }
}
```

## <span class="tpl">07</span>Related Concepts

- **Concurrency & Async Processing** — actors are the ultimate concurrency abstraction.
- **Error Handling & Resilience** — supervision and isolation are built in.
- **Distributed Systems Architecture** — actors naturally span machines.

**Source material:** *Programming in Scala* (Odersky) ch. 30 on actors; Erlang documentation on the actor model; the Akka documentation.

</div>

<div class="pane pane-build">

## Build Tasks — The Actor Model

### Task 1 — Implement a simple actor system
Use Akka (or similar) to build two actors that exchange messages. One increments a counter; the other requests the count.
- **Done when:** the counter is correct and neither actor blocks the other.

### Task 2 — Crash and supervise
Make an actor crash (divide by zero). Observe that the supervisor restarts it and the system continues.
- **Done when:** the crash is isolated and recovery is transparent.

### Task 3 — Scale the model
Spawn 10,000 actors (each a lightweight counter or handler). Observe memory usage and responsiveness.
- **Done when:** you've experienced the scale difference vs threads.

</div>
