---
title: "Measuring delivery without measuring people"
date: 2026-08-04T23:00:00+02:00
description: "A data model for effort, delivery, productivity and quality across consulting teams — and why the modelling problem was defining metrics that survive comparison between teams."
menu:
  sidebar:
    name: "Delivery analytics model"
    identifier: delivery-productivity-quality-model
    weight: 50
tags: ["Power BI", "SQL", "Data Modelling", "Analytics"]
categories: ["Business Intelligence"]
---

At [NTT DATA](https://es.nttdata.com) I built the data model behind effort,
delivery, productivity and quality analysis for delivery teams. The technical part
was a conformed star schema. The hard part was that the moment you measure
delivery, people assume you are measuring them — and if the model makes that easy,
they are right.

## The problem

Each team reported its own progress, in its own units, on its own cadence. Rolling
that up produced a number that was arithmetically valid and meaningless: story
points from teams with different scales, effort recorded against different work
breakdowns, defects counted with different definitions of what a defect is.

The request was a shared basis for decisions. The failure to avoid was a league
table.

## The architecture

{{< mermaid >}}
flowchart LR
  TIME[Time tracking] --> STG[Staging: typed and deduplicated]
  WORK[Work items and iterations] --> STG
  DEF[Defects and test results] --> STG
  REL[Releases and deployments] --> STG
  STG --> DIM[Conformed dimensions: date, team, engagement, work type, severity]
  STG --> FCT[Fact tables: effort, delivery, defects, releases]
  DIM --> MODEL[Semantic model]
  FCT --> MODEL
  MODEL --> RPT[Team view: trends over time]
  MODEL --> PORT[Portfolio view: aggregates, no ranking]
{{< /mermaid >}}

## Decisions and their trade-offs

### Conformed dimensions first, facts second

Date, team, engagement, work type and severity are defined once and shared by
every fact table. That is what makes effort and defects comparable at all: without
a shared calendar and a shared work-type hierarchy, any cross-fact question is a
join between two different interpretations of the same word.

The cost is the slow part of the project, and it is political rather than
technical — agreeing one work-type hierarchy across teams that each had a good
reason for theirs.

### Metrics defined as ratios with an explicit denominator

Not "velocity" but delivered units per unit of effort, with both sides visible.
Not "quality" but defects per delivered unit, split by severity, with the
denominator shown next to it.

The reason is that a bare numerator invites the wrong comparison. A team with more
defects might have shipped four times as much. Showing the denominator makes that
visible in the visual rather than in a footnote nobody reads.

### Trends per team, aggregates across teams — never a ranking

A team sees its own series over time, which is the comparison that is actually
valid: same people, same context, changing over months. The portfolio view shows
totals and distributions, not a sorted list of teams.

This is the decision I would defend hardest, and it is a modelling decision, not a
report decision. Once the model can produce a ranking cheaply, someone will build
that report, and from then on the data is an instrument of performance management
and every input to it becomes negotiated. What gets measured gets gamed; what gets
ranked gets gamed immediately.

### Effort at the granularity it is recorded, not finer

Time tracking is honest at the week-and-work-type level and fiction at the
task-hour level. The model stores the grain it actually has. Reporting at a finer
grain than the source supports produces precise numbers that are wrong, which is
worse than coarse numbers that are right.

### Reports that answer on the first screen

Every report opens on the question it exists to answer, with the drill-down
underneath rather than in front. If the answer takes three clicks, the report gets
replaced by someone's spreadsheet.

## What changed

- Delivery conversations moved from each team defending its own numbers to a
  shared set everyone recognised, because the definitions were visible.
- Cross-engagement questions became answerable without a manual reconciliation.
- Quality stopped being a defect count and became a rate, which changed which
  teams looked like they had a problem — in both directions.

## What I would do differently

**Write down what the model must not make easy, at the same time as the
requirements.** The no-ranking decision held because I made it early and could
point at it. Had it come up six months in, under pressure, it would have lost.

**Agree the work-type hierarchy before building anything on top of it.** We
modelled while that conversation was still open, and reworked two fact tables
when it closed.
