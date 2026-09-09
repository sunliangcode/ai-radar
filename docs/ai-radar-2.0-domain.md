# AI Radar 2.0 — Domain & architecture

> Tagline: **Know what changed. Know why it matters. Know what to do.**

1.0 (steps 01–05) remains the **World Intelligence** chassis: connectors, pipeline, events, briefs, delivery, MCP.  
2.0 adds **Personal** and **Action** intelligence on the same Java 21 + Spring Boot 3 + SQLite + React stack.

## Core loop

```text
Context → Signal(Item) → Change ← Event → Impact → Opportunity/Risk → Action → Experiment → Outcome → Memory
```

## Object mapping

| 1.0 | 2.0 | Notes |
| --- | --- | --- |
| Source / NewsItem | Signal | Unchanged ingest |
| Event + Timeline | Change | Change is a projection/adapter over Event (MVP) |
| Settings `interestProfile` | Context | Structured profile; interest string synced as summary |
| Intelligence Home (4 cols) | Intelligence Home (5 Qs) | changed / why care / impact / do / watch |
| Brief / Delivery | High-impact digest | Still reused for push |

## Engine packages (`com.airadar`)

| Package | Role |
| --- | --- |
| `connector` / `pipeline` / `event` | World chassis (reuse) |
| `context` | Profile, projects, tech, interests, goals |
| `change` | Event → Change DTO |
| `impact` | Context × Change → multi-dim scores + tier |
| `opportunity` | Opportunities / risks from high impact |
| `action` | Recommended actions + status |
| `experiment` | Manual benchmark results |
| `outcome` | Monthly ROI summary |
| `memory` | Liked / rejected / effective feedback |

## Terminology

| Term | Meaning |
| --- | --- |
| Intelligence Home | Home answering five questions (not a vanity dashboard) |
| Change | Important external shift (backed by Event evidence) |
| Impact | Why it matters to *your* Context |
| Action | Concrete next step with success criteria |
| Experiment | Measurable trial of an Action |
| Outcome / AI ROI | Time saved vs AI cost |
| Memory | Preferences and past outcomes feeding future Impact |

## Explicit non-goals (MVP)

No vector DB, full knowledge graph, auto-running benchmark agents, new connectors, or multi-tenant SaaS.

See also: [`aim/06-ai-radar-2.0.md`](../aim/06-ai-radar-2.0.md).
