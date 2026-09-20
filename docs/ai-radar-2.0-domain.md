# AI Radar 2.0 — Domain & architecture

> Tagline: **Know what changed. Know why it matters. Decide what to do.**

1.0 (steps 01–05) remains the **World Intelligence** chassis: connectors, pipeline, events, briefs, delivery, MCP.  
2.0 is the **Personal** loop on the same Java 21 + Spring Boot 3 + SQLite + React stack.

## Product loop (user-facing)

```text
Context → Signal → Change → Decision → (review on Today)
```

Four concepts users need:

| Term | Meaning |
| --- | --- |
| **Signal** | One raw item from a source |
| **Change** | A real shift inferred from Signals (Event + Impact) |
| **Decision** | What you chose to do about a Change |
| **Context** | Who you are — drives why a Change matters |

Primary UI: **Today** · **Radar** · **Decisions** · **Chat** · **Settings**.  
Changes / Watching / Briefs are not primary nav; Change detail and `/briefs/:date` remain.

## Core loop (engines)

```text
Context → Signal(Item) → Change ← Event → Impact → Decision
```

Internal (not primary product mental model): Opportunity / recommended Action / Experiment / Outcome / Memory still exist in packages for scoring and feedback.

## Object mapping

| 1.0 | 2.0 | Notes |
| --- | --- | --- |
| Source / NewsItem | Signal | Unchanged ingest |
| Event + Timeline | Change | Change is a projection/adapter over Event |
| Settings `interestProfile` | Context | Structured profile; interest string synced as summary |
| Intelligence Home | Today | What changed / why / impact / what to do |
| Brief / Delivery | Artifact | Push + `/briefs/:date` archive |

## Engine packages (`com.airadar`)

| Package | Role |
| --- | --- |
| `connector` / `pipeline` / `event` | World chassis |
| `context` | Profile, projects, tech, interests, goals |
| `change` | Event → Change DTO |
| `impact` | Context × Change → scores + tier |
| `decision` | User decisions + revisit |
| `watch` | Follow a Change (`watch_subscriptions`) |
| `opportunity` / `action` / `experiment` / `outcome` / `memory` | Internal engines (not top-level nav) |

## Explicit non-goals (MVP)

No vector DB, full knowledge graph, auto-running benchmark agents, new connectors, or multi-tenant SaaS.

Historical iteration notes: [`aim/README.md`](../aim/README.md).
