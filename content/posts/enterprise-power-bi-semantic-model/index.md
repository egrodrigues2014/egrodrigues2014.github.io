---
title: "An enterprise Power BI semantic model that survives contact with users"
date: 2026-08-05T02:00:00+02:00
description: "Composite Import plus DirectQuery, row-level security, incremental refresh and gateways — and the DAX patterns that stopped the model being rewritten every quarter."
menu:
  sidebar:
    name: "Power BI semantic model"
    identifier: enterprise-power-bi-semantic-model
    weight: 20
tags: ["Power BI", "DAX", "Azure", "Data Modelling"]
categories: ["Business Intelligence"]
---

The gold layer of a lakehouse is not what people use. What they use is a semantic
model, and the difference between a model that lasts and one that gets rewritten
every quarter is almost entirely in decisions made before the first measure is
written.

This is the model I own at [MOD — Makers of Digital](https://mod.es), across
agrifood, retail and food-service operations. No client is named; figures are
relative.

## The problem with the model that already existed

The report layer had grown the way report layers do. Several `.pbix` files, each
with its own copy of the calendar, its own definition of "active customer", and
its own refresh schedule. Two of them disagreed about margin, and both were right
according to their own logic.

The failure is not technical. It is that the definition of a metric lived in
whichever file the person who needed it happened to open.

## The architecture

{{< mermaid >}}
flowchart LR
  GOLD[(Gold star schemas)] --> IMP[Import partitions: history]
  GOLD --> DQ[DirectQuery: current period]
  IMP --> MODEL[Composite semantic model]
  DQ --> MODEL
  MODEL --> RLS[Row-level security]
  RLS --> RPT[Reports and apps]
  GW[On-premises gateway] --> DQ
  PIPE[Deployment pipelines: dev, test, prod] --> MODEL
{{< /mermaid >}}

One model, shared. Reports connect to it live rather than each carrying their own
copy of the data.

## Decisions and their trade-offs

### Composite Import plus DirectQuery, not one or the other

Import is fast and DirectQuery is current, and the business wanted both. The
split is by time: closed periods are imported, the open period is DirectQuery
against the serving layer.

This is the decision I would defend hardest and also the one that costs the most.
A composite model has two performance profiles in one artefact, so a slow visual
might be a bad measure or it might be a gateway round trip, and you cannot tell
from the report. It also constrains the relationships you are allowed to define
across storage modes. Anyone maintaining a composite model needs to know it is
composite — which is a documentation problem, and documentation problems are how
models rot.

If the open period had been small enough to import on an hourly cycle, pure
Import would have been the better answer. It was not.

### Incremental refresh, sized to the data rather than to the default

Partitions by month, with a rolling window over the years that anyone actually
queries, and a refresh policy that only touches the recent partitions. The
default full refresh was reading years of unchanged history every time.

The trap here is `RangeStart`/`RangeEnd` folding. If the parameters do not fold
into the source query, Power BI dutifully pulls everything and filters it in
memory, the refresh gets slower rather than faster, and nothing tells you. That
is a thing to verify in the query diagnostics, once, on purpose.

### Row-level security as part of the model, not as separate reports

Roles defined on the model, with the user-to-scope mapping held as a table in the
model rather than as a hardcoded DAX filter. Adding a region or moving a manager
is then a data change, not a model change and a redeployment.

The cost is that RLS interacts with composite storage modes and with
many-to-many bridges in ways that are easy to get subtly wrong, so the roles need
testing as themselves — viewing the report as a role, deliberately, as part of
release. It is the one part of a Power BI model where a mistake is a data leak
rather than a wrong number.

### DAX patterns chosen for readability, not cleverness

Time intelligence, variance analysis and KPI segmentation, written as a small
number of patterns applied consistently:

- Base measures do one thing. Everything else composes them.
- Variables over repeated subexpressions, always — the readability gain is larger
  than the performance one.
- Many-to-many handled with an explicit bridge table and a documented direction,
  never with bidirectional filtering switched on to make a visual work. That
  switch is how ambiguous filter paths get created, and the symptom appears
  months later in an unrelated report.

### Deployment pipelines, so "it works on my desktop" stops being a release process

Dev, test and production stages with parameterised data sources. The gateway
lives on the same side as the serving layer.

## What changed

- One definition of each metric, so two reports disagreeing became a bug with an
  owner rather than a difference of opinion.
- Refresh duration fell by a large multiple once incremental refresh actually
  folded — most of the original window was re-reading unchanged history.
- Report authors stopped modelling. They compose measures that already exist,
  which is both faster for them and the reason the model stays coherent.

## What I would do differently

**Write the metric definitions down before building the model, in the language of
the business.** We derived them from the existing reports, which meant inheriting
their disagreements and then resolving them under time pressure.

**Test RLS from the first role, not the fifth.** The roles were correct, but I
verified them later than I should have for something whose failure mode is
showing one region's numbers to another.
