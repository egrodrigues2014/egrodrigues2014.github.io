---
title: "A medallion lakehouse on Azure and Microsoft Fabric"
date: 2026-08-05T03:00:00+02:00
description: "Why the bronze/silver/gold split, dbt models and parameterised incremental loads replaced a nightly full reload — and which of those decisions I would make differently."
menu:
  sidebar:
    name: "Medallion lakehouse"
    identifier: medallion-lakehouse-azure-fabric
    weight: 10
tags: ["Azure", "Microsoft Fabric", "dbt", "Apache Airflow", "Data Modelling"]
categories: ["Data Engineering"]
---

At [MOD — Makers of Digital](https://mod.es), a digital consultancy in Barcelona, I
design and run the data platforms behind agrifood, retail and food-service
operations. This post is about the shape those platforms converged on, and about
the parts of the decision that were not obvious at the time.

No client is named and every figure is relative. The architecture is mine to
describe; their data is not.

## The problem

The starting point is familiar: an ERP as the system of record, a CRM, a handful
of REST APIs, and per-location spreadsheets that somebody maintains by hand.
Reporting ran as a nightly full reload into one database, and "the numbers" were
whatever the last successful run had produced.

That produced three symptoms, and only the first one gets reported as a problem:

- The refresh window ran into business hours, so the working day started against
  stale figures.
- Changing a report meant editing SQL where ingestion, business rules and
  presentation all lived in the same view. Every change risked all three.
- Nobody could say where a number came from. When two reports disagreed, the
  answer was an afternoon of manual tracing.

## Constraints that shaped the design

- **No greenfield.** The ERP could not be modified, and its schema changes
  without notice.
- **A small team.** Whatever gets built has to be operable by people who did not
  build it. That rules out clever.
- **Visible cost.** Cloud spend is reviewed monthly, so every bit of compute has
  to be justifiable against the question it answers.

## The architecture

{{< mermaid >}}
flowchart LR
  ERP[ERP] --> ING
  CRM[CRM] --> ING
  API[REST APIs] --> ING
  OPS[(Operational databases)] --> ING
  ING[Ingestion: Data Factory and Airflow] --> BRONZE
  BRONZE[Bronze: raw, append-only, ADLS Gen2] --> SILVER
  SILVER[Silver: conformed and tested, dbt] --> GOLD
  GOLD[Gold: star schemas, Fabric and Azure SQL] --> BI[Power BI semantic model]
{{< /mermaid >}}

The three layers are the well-known medallion split. What makes it work is not
the naming but the contract between the layers, and that is where the real
decisions were.

## Decisions and their trade-offs

### Bronze is a landing zone, not a database

Raw payloads, append-only, partitioned by ingestion date, no cleaning and no
deduplication. It is deliberately dumb.

The reason is recovery. When a bug is found in a silver transformation — and one
always is — the fix is to change the model and reprocess, not to go back to the
source system and ask for an extract of last quarter. Bronze is what buys you
that. The cost is storage, which is the cheapest thing in the stack; lifecycle
policies move older partitions to a cool tier.

### Silver is where dbt earns its place

Conformed entities, deduplicated, typed, with the business rules applied once and
in one place. Every model has tests — uniqueness and not-null on keys,
referential integrity across entities, accepted values on the fields that drive
branching logic — and the lineage graph is generated rather than described.

The trade-off is real: dbt adds a tool, a repository and a deployment step to a
small team's surface area. It paid for itself the first time someone asked why a
figure had moved and the answer was a model name and a test, not an afternoon.

Where history matters — price lists, customer attributes, product hierarchies —
silver holds SCD Type 2 rather than the current state. Snapshot facts cover the
cases where "what did we believe on that date" is the actual question.

### Gold is modelled for the question, not for the source

Star schemas, tuned with partitioning, indexing and pre-aggregation for the
queries that are actually run. Gold is allowed to duplicate data; that is its
job. The mistake I have seen most often is treating gold as a normalised
warehouse and then wondering why the reports are slow.

### Incremental and parameterised, not full reloads

Each source has a watermark, and each pipeline is one parameterised definition
rather than one pipeline per table. That is what took the refresh window down,
and it is also what took the compute bill down: an incremental load touches a
fraction of the rows a full reload does.

The cost is that incremental logic has failure modes a full reload does not —
late-arriving records, soft deletes that never reach you, a watermark that
advances past rows still in flight. Each of those is a test in silver rather than
a hope.

### Fabric alongside Azure SQL, not instead of it

Microsoft Fabric — OneLake, Lakehouse and Warehouse — carries the layered data.
Azure SQL stays as the serving layer where a report needs low-latency point
lookups rather than a scan. This part is in active production development, and I
would not claim it is settled.

Choosing one platform for everything would be a simpler story to tell and a worse
system. The interesting question is not "lakehouse or warehouse" but where the
boundary between them sits, and that depends on the query pattern, not on the
brochure.

## What changed

Relative figures, because the absolute ones are not mine to publish:

- The refresh window shrank by roughly three quarters — from a nightly batch that
  spilled into the morning to an hourly cycle.
- Compute spend fell, because incremental loads read a fraction of the data and
  the serving layer stopped being asked to do analytical scans.
- A number in a report now resolves to a named model with tests attached. That
  changed the conversations more than the latency did.

## What I would do differently

**Data contracts at the bronze/silver boundary from day one.** We retrofitted
them after a silent ERP schema change flowed through to silver, and the pipeline
kept succeeding while producing wrong output. A green run that is wrong is worse
than a red one, and a schema assertion at the boundary is a few lines.

**Be slower to add sources, faster to add tests.** The pressure is always to
connect one more system. The value shows up when the ones already connected can
be trusted.
