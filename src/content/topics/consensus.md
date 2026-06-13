---
title: 'Consensus (Raft, Paxos)'
description: 'Distributed consensus: how machines agree on a value when any of them can fail. The foundation of replicated state machines.'
readingTime: 13
---

<div class="pane pane-learn">

## <span class="tpl">01</span>Concept Overview

Consensus is the problem of getting N machines to agree on a value when any subset can fail or slow down. It sounds simple and is impossible without constraints — until you realize the constraints (synchronous clocks, reliable channels) are themselves false. The breakthrough is accepting that impossibility, then designing for near-certainty: algorithms like Raft and Paxos succeed if a *majority* of machines is available and working.

The output is a **replicated state machine**: every machine executes the same sequence of commands and reaches the same state. This is the foundation of replicated databases, distributed locks, and service discovery. Raft is the modern default for its understandability; Paxos is older and more theoretically pure.

<div class="concept-card">
<div class="cc-label">Core principle</div>

Consensus is impossibly hard in the general case (FLP impossibility). Every algorithm trades off safety, liveness, and partition tolerance. Raft and Paxos choose safety and partition tolerance over immediate liveness — they may not progress if a majority is unavailable, which is acceptable.

</div>

## <span class="tpl">02</span>Mental Model

A parliament voting on a law. Proposing a law (a command), members debate (the log is replicated), and a majority must agree before it becomes law (committed). If a member crashes, the law survives as long as a majority remains. A minority can't unilaterally revoke a law.

## <span class="tpl">03</span>Real-World Example

**Etcd stores Kubernetes cluster state via Raft.** The cluster state (which nodes exist, which pods run where) is replicated across three etcd instances via Raft. A write (a pod placement) is proposed by the leader, logged on a majority, then committed. If the leader crashes, a new leader is elected from the remaining machines. The state machine (the Kubernetes API server) queries the committed state and acts on it. The entire system's consistency rests on Raft's guarantee: every committed entry appears in the same order on every machine.

## <span class="tpl">04</span>Common Mistakes

- **Running consensus with even-numbered machines.** A 4-node cluster needs 3 to form a quorum. If split 2-2, neither side can progress. Always odd-numbered (3, 5, 7).
- **Assuming consensus solves everything.** Consensus replicates the *log*, not the interpretation. A log can be replicated perfectly and still be applied differently on different machines (bugs in state machine logic).
- **Network isolation and the split-brain fear.** Consensus is designed for partition tolerance: the majority side continues; the minority side blocks. This is correct, not a bug.
- **Not understanding the time costs.** A Raft commit requires a leader election (if needed) and replication to a majority — not instant. 50–500ms for a 3-node cluster is normal.

## <span class="tpl">05</span>Interview Perspective

Consensus is a knowledge probe more than a design question. The strong answer: "Consensus is how multiple machines agree; Raft is the modern algorithm, chosen for safety and understanding; a majority must agree before a value is committed." Mentioning quorum (majority), the FLP impossibility (why eventual consistency exists), and that the leader can crash and be replaced shows depth.

## <span class="tpl">06</span>Code / Pseudocode

```python
# Raft log replication in pseudocode (not production code)

class RaftNode:
    def __init__(self, term=0, voted_for=None, log=[], commit_index=0, last_applied=0):
        self.term = term
        self.voted_for = voted_for
        self.log = log  # [(term, command), ...]
        self.commit_index = commit_index
        self.last_applied = last_applied
    
    def append_entries(self, leader_term, prev_log_index, entries, leader_commit):
        """Receive log entries from the leader."""
        if leader_term < self.term:
            return False  # reject: leader is stale
        
        # Check log consistency
        if prev_log_index > 0:
            if prev_log_index > len(self.log) or self.log[prev_log_index - 1][0] != leader_term:
                return False  # log mismatch
        
        # Append new entries
        self.log = self.log[:prev_log_index] + entries
        
        # Update commit index
        if leader_commit > self.commit_index:
            self.commit_index = min(leader_commit, len(self.log))
        
        return True
    
    def apply_to_state_machine(self):
        """Apply committed entries to the state machine."""
        while self.last_applied < self.commit_index:
            self.last_applied += 1
            command = self.log[self.last_applied - 1][1]
            # Execute command on the state machine
            self.state_machine.apply(command)
```

## <span class="tpl">07</span>Related Concepts

- **Consistency Models** — consensus achieves linearizability.
- **Fallacies of Distributed Computing** — consensus is the answer to network failures.
- **Data Modeling & Databases** — replicated databases use consensus internally.

**Source material:** Diego Ongaro's Raft paper and the Raft Visualization (raft.github.io) are the best learning resource; Paxos Made Simple (Lamport) for the theoretical foundation; the Jepsen blog for practical implementation failures.

</div>

<div class="pane pane-build">

## Build Tasks — Consensus

### Task 1 — Trace Raft
Read the Raft paper or watch the visualization. Draw a leader election scenario and a log replication.
- **Done when:** you can explain why a majority is needed and what happens to the minority.

### Task 2 — Implement in etcd
Trigger a leader failure in a 3-node etcd cluster. Observe the election and that writes continue.
- **Done when:** you've seen the new leader elected and writes succeed after.

### Task 3 — Partition and heal
Partition a 3-node cluster (1 vs 2). Verify the majority side continues and the minority blocks. Heal the partition and verify recovery.
- **Done when:** the split-brain scenario is understood and harmless.

</div>
