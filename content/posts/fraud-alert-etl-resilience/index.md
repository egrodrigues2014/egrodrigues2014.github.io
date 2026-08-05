---
title: "An ETL that restarts itself: fraud alerts on motor insurance claims"
date: 2026-08-04T22:00:00+02:00
description: "Owning fraud-alert generation end to end, and the automatic restart system that turned a 3 a.m. phone call into a log line — plus what idempotency actually costs."
menu:
  sidebar:
    name: "Self-healing fraud ETL"
    identifier: fraud-alert-etl-resilience
    weight: 60
tags: ["SAS", "SQL", "Linux", "ETL", "Data Quality"]
categories: ["Data Engineering"]
---

At [PeRTICA Análisis Estadísticos](https://www.pertica.es), a SAS partner and
analytics consultancy for insurance and banking, I owned the fraud-alert
generation process for motor insurance claims end to end — from source data to the
alert an investigator acts on.

The part worth writing about is not the scoring. It is that the process had to
finish before the working day started, every day, and for a long time it did not.

## The problem

An overnight chain: extract claims and policy data, conform it, apply the alert
rules, and produce a prioritised queue for the fraud investigation team. If it
failed at 3 a.m., somebody was called, worked out where it stopped, cleaned up
whatever half-written state it had left, and restarted it. If nobody was called,
the team arrived to an empty queue.

Both outcomes cost the same thing: a day of investigation capacity on a process
whose value is time-sensitive, because a claim is easier to investigate before it
is paid.

## The architecture

{{< mermaid >}}
flowchart LR
  CLM[(Claims)] --> EXT[Extract, per-source watermark]
  POL[(Policies and parties)] --> EXT
  HIST[(Claim history)] --> EXT
  EXT --> CONF[Conform and validate]
  CONF --> RULES[Alert rules and scoring]
  RULES --> QUEUE[(Prioritised alert queue)]
  QUEUE --> INV[Investigators]
  WD[Watchdog: checkpoints, retries, escalation] --> EXT
  WD --> CONF
  WD --> RULES
{{< /mermaid >}}

## Decisions and their trade-offs

### Every step is idempotent, or it is not a step

This is the whole design. A step may be run twice with the same inputs and must
leave the same state — which in practice means writing to a staging target and
swapping it in, never appending in place, and keying every output so a re-run
replaces rather than duplicates.

The cost is real: idempotency is more code, more storage, and it rules out the
convenient shortcuts. It is also the only thing that makes automatic restart safe.
Retrying a non-idempotent step is worse than failing, because it produces duplicate
alerts, and an investigator who stops trusting the queue is a worse outcome than an
empty one.

### Checkpoints at step boundaries, not inside steps

The watchdog knows which steps completed. On restart it resumes from the last
completed boundary rather than from the beginning. Finer-grained checkpointing was
tempting and I did not do it: the bookkeeping grows faster than the time it saves,
and the bookkeeping is itself a thing that can be wrong.

### Distinguish the transient from the real, and escalate the difference

A locked table, a dropped connection or a source system still closing its day are
transient: retry with a backoff. A validation failure, a missing mandatory field
or a row count outside its expected band are not transient, and retrying them just
burns the window. Those stop and escalate.

Getting this classification wrong in either direction is the main failure mode.
Treating a real error as transient means the process retries until the window
closes; treating a transient error as real means a phone call that a thirty-second
wait would have solved.

### Monitoring the platform, not just the job

Bash on Linux and shell scripts on Windows watching the things that actually cause
failures: SAS services and their resources, disk headroom, log patterns that
precede a failure rather than report it. Most of the 3 a.m. calls had a warning
sign twenty minutes earlier that nobody was reading.

### Tuning came after reliability, not before

Query rewrites and job scheduling brought execution times down, and that mattered —
a shorter run has more room to retry inside the window. But it was second. A fast
process that fails is still a failed process, and speed had been the thing everyone
asked for first.

## What changed

- Overnight failures stopped producing phone calls and started producing log
  lines. The recovery that a person used to perform manually became the normal
  path.
- The alert queue was ready before the investigation team arrived, consistently,
  which is the only version of this that has value.
- Execution time came down materially through query tuning and scheduling — which
  mostly bought more room for the retries.

## What I would do differently

**Build the run history before the watchdog.** I had reliability before I had good
data about failures, so the classification of transient versus real came from
memory rather than from a table. That table would have made it better and would
have taken an afternoon.

**Make the "did it produce a plausible number of alerts" check a first-class
step.** Volume anomaly detection on your own output catches the class of bug where
everything succeeds and the result is wrong, and that class is the one that
survives all the other checks.
