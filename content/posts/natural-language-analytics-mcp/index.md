---
title: "Natural-language analytics over a semantic model, with MCP"
date: 2026-08-05T01:00:00+02:00
description: "Wiring the Claude API and an MCP server to a Power BI semantic model instead of to the database — why that boundary is the whole design, and where it still fails."
menu:
  sidebar:
    name: "Natural-language analytics"
    identifier: natural-language-analytics-mcp
    weight: 30
tags: ["LLM", "MCP", "Power BI", "Python", "FastAPI"]
categories: ["Data Engineering"]
---

"Let people ask the data questions in plain language" is the request every data
team gets, and the obvious implementation — point a language model at the
warehouse and let it write SQL — is the one that fails in production. This is
what I built instead at [MOD — Makers of Digital](https://mod.es), and an honest
account of what it does not do.

## Why text-to-SQL against the warehouse is the wrong boundary

A model that writes SQL against raw tables has to rediscover, on every question,
everything the business already decided once: which of four date columns means
"the sale happened", whether returns are excluded from revenue, what makes a
customer active, which rows are test data.

It will produce an answer. The answer will be confidently wrong in ways that
require the person asking to already know the right number to notice. That is the
worst possible failure mode for a tool whose whole purpose is helping people who
do not know the number.

## The boundary that works

The semantic model already contains those decisions. Revenue is a measure with a
definition. The calendar knows what a fiscal quarter is. Row-level security knows
what this user is allowed to see. So the language model does not query the
database — it queries the semantic model, through a tool whose surface is the
measures and dimensions that exist.

{{< mermaid >}}
flowchart LR
  USER[Question in plain language] --> API[FastAPI service]
  API --> LLM[Claude API]
  LLM --> MCP[MCP server: model metadata and query tools]
  MCP --> SM[Power BI semantic model]
  SM --> RLS[Row-level security applies here]
  MCP --> LLM
  LLM --> ANS[Answer plus the query and the measures used]
  ANS --> USER
{{< /mermaid >}}

The MCP server exposes two kinds of tool: metadata — what tables, measures and
dimensions exist, with their descriptions — and execution, which runs a DAX query
and returns rows. The model discovers the vocabulary and then composes within it.

## Decisions and their trade-offs

### The tool surface is the guardrail, not the prompt

A prompt asking the model to be careful is a suggestion. A tool that can only
evaluate measures that exist is a constraint. If a question needs a metric nobody
has defined, the correct outcome is the system saying so — not inventing an
arithmetic that looks plausible.

The cost is coverage. Questions the semantic model cannot express get refused, and
some of those refusals are annoying rather than protective. I would still take
that trade every time: a refusal is recoverable, a wrong number that gets acted on
is not.

### Security stays where it already was

Queries run as the asking user, so row-level security applies without the
MCP server knowing anything about permissions. Reimplementing authorisation in a
new layer is how you end up with two models of who can see what, and they
disagree quietly.

### Every answer shows its work

The response carries the DAX that produced it and the measures involved. Two
reasons: someone who knows the domain can spot a wrong interpretation in seconds,
and the ones who check build the trust that makes the tool usable by the ones who
do not.

### It is a service, not a chat window

A small FastAPI service, reachable from the tools people already have open —
which in practice means Slack and Telegram bots rather than another portal to log
into. A data product nobody opens is not a data product.

## Where it still fails

- **Ambiguous questions get an interpretation, not a clarification.** "How are we
  doing this month" resolves to something reasonable, and reasonable is not the
  same as what was meant. Asking back is better and I have not built it well yet.
- **Comparative and multi-step questions degrade.** One measure sliced by one
  dimension is reliable. "Why did margin drop in that region" is a chain of
  reasoning, and the failure is silent rather than loud.
- **Coverage is bounded by the semantic model,** by design. That is a feature
  until someone needs the number that nobody modelled.

## What I would do differently

**Write the measure descriptions for the model, not for the tooltip.** The
quality of the answers tracks the quality of the metadata far more than the
prompt. A measure called `Rev LY adj` with no description is invisible to a
language model in exactly the way it is invisible to a new colleague.

**Log the questions from day one.** The list of things people asked that the
semantic model could not answer turned out to be the most useful data-modelling
backlog I have ever had, and I started keeping it late.
