---
title: "Demand forecasting that turns into a purchase order"
date: 2026-08-05T00:00:00+02:00
description: "Prophet and scikit-learn in production for per-location demand planning — and why the hard part was never the model, but the baseline, the horizon and getting a buyer to act on it."
menu:
  sidebar:
    name: "Demand forecasting"
    identifier: demand-forecasting-purchasing
    weight: 40
tags: ["Python", "Prophet", "scikit-learn", "Power BI", "Forecasting"]
categories: ["Machine Learning"]
---

A forecast that nobody acts on is a chart. This one ends in a per-location
purchasing recommendation, which is a much harder thing to build than the model
that sits in the middle of it.

Built at [MOD — Makers of Digital](https://mod.es) for food-service and retail
operations. No client is named; figures are relative.

## The problem

Purchasing was per location and per buyer, from experience. That works, and it
works unevenly: two locations with similar demand patterns would hold very
different stock depending on who ordered. The symptoms were at both ends —
stockouts on the items that matter and waste on the perishable ones — and neither
was visible as a number anyone owned.

## The architecture

{{< mermaid >}}
flowchart LR
  GOLD[(Gold: sales facts by location and item)] --> FEAT[Feature build: calendar, promotions, weather, lead times]
  FEAT --> BASE[Baseline: seasonal naive]
  FEAT --> MODEL[Prophet and scikit-learn per series]
  BASE --> EVAL[Backtest on rolling origins]
  MODEL --> EVAL
  EVAL --> FC[(Forecast table: item, location, horizon)]
  FC --> REC[Purchasing recommendation: stock, lead time, pack size]
  REC --> BI[Power BI: buyer view]
  REC --> ALERT[Alerts for the exceptions]
{{< /mermaid >}}

## Decisions and their trade-offs

### The baseline comes first, and it is allowed to win

Before any model, a seasonal naive forecast: what happened the same weekday last
week, or the same week last year. Every model is scored against it on the same
backtest.

This is the single most useful discipline in the whole project. A large minority
of series are best served by the naive baseline, and knowing which ones means not
maintaining a model that adds nothing. It also gives an honest answer to "how good
is the forecast" — better than what, by how much, on which series.

### Prophet where seasonality and holidays dominate, gradient boosting where features do

Prophet handles the series where the structure is calendar-driven: weekly and
yearly seasonality, holiday effects, a trend that changes slowly. Scikit-learn
models take over where the signal is in the features — promotions, price changes,
weather.

The trade-off is two model families to operate instead of one. It is worth it
because the failure modes are different and visible: Prophet degrades gracefully
and predictably, tree models fail confidently on regimes they have never seen. A
new location with no history goes to the baseline until it has enough of one, and
that rule is in the pipeline rather than in someone's head.

### The horizon is the lead time, not a round number

Forecasting 30 days ahead is a choice about presentation. The useful horizon is
however long it takes the goods to arrive, per supplier, and that is what the
recommendation is computed over. Getting this wrong makes an accurate forecast
useless: nobody can act on a number that arrives after the order had to be placed.

### The recommendation is not the forecast

Between the two sit the constraints that make it an order: current stock, pack
size, minimum order quantity, shelf life, and the asymmetry between a stockout and
a write-off. Those are business rules, they change, and they live in a modelled
layer where a buyer can see them rather than inside the model.

### Backtesting on rolling origins, retraining on a schedule

Evaluation is a rolling-origin backtest, not a single train/test split — the
question is how the model behaves week after week, not on one lucky cut. Retraining
is scheduled and versioned; a forecast is stored with the model version that
produced it, so a bad week can be explained rather than argued about.

## What changed

- Purchasing moved from per-buyer judgement to a recommendation everyone starts
  from, which mostly means the variance between locations dropped.
- Waste on perishables and stockouts on core items both improved. Both were
  measurable for the first time, which is part of the improvement.
- The forecast has a stated accuracy against a stated baseline, so the
  conversation about whether to trust it has an answer.

## What I would do differently

**Ship the baseline to production first, alone.** It would have delivered most of
the value in a fraction of the time, and it would have made the case for the
models with evidence instead of a promise.

**Instrument the decision, not just the prediction.** I measured forecast error
early and how often the recommendation was overridden late. The override rate
turned out to be the more useful signal — it points at where the business rules
are wrong, which the error metric cannot see.
