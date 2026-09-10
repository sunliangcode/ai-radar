import { describe, expect, it } from 'vitest'
import { formatAiMonitorBody } from './formatAiMonitorBody'

describe('formatAiMonitorBody input', () => {
  it('extracts multi-line score profiles and item titles (not just Language)', () => {
    const prompt = `You are an AI news relevance scorer for a personal intelligence radar.

Language: zh

Interest profile (prefer these topics):
AI agents
LLM tooling

Dislike profile (avoid / down-rank these topics):
celebrity gossip

Score each item from 0 to 100 for how valuable it is to the user given the interest profile.

Return ONLY valid JSON with this shape:
{
  "items": [
    {
      "index": 0,
      "score": 75,
      "reason": "short reason",
      "tags": ["tag1"],
      "category": "ai"
    }
  ]
}

Items to score:
[{"index":0,"title":"OpenAI ships Agents SDK","url":"https://example.com/a"},{"index":1,"title":"Random sports news","url":"https://example.com/b"}]`

    const { text, isStructured } = formatAiMonitorBody(prompt, {
      kind: 'input',
      operation: 'score',
    })
    expect(isStructured).toBe(true)
    expect(text).toContain('**Language:** zh')
    expect(text).toContain('AI agents')
    expect(text).toContain('LLM tooling')
    expect(text).toContain('celebrity gossip')
    expect(text).toContain('OpenAI ships Agents SDK')
    expect(text).toContain('Random sports news')
    // Must not dump the JSON schema as the dislike value
    expect(text).not.toMatch(/\*\*Dislike profile:\*\*[\s\S]*Return ONLY valid JSON/)
  })

  it('extracts summarize same-line Interest profile plus Title/URL/Snippet', () => {
    const prompt = `You summarize AI news for a personal daily briefing.

Language: en
Interest profile: AI agents and developer tools

Write exactly ONE concise sentence focused on what happened and why it matters, in the requested language.

Return ONLY valid JSON:
{
  "summary": "...",
  "titleDisplay": "..."
}

Title: Agents SDK launch
URL: https://example.com/agents
Snippet: OpenAI released a new Agents SDK for building tool-using agents.
Score reason: Matches interest in AI agents`

    const { text, isStructured } = formatAiMonitorBody(prompt, {
      kind: 'input',
      operation: 'summarize',
    })
    expect(isStructured).toBe(true)
    expect(text).toContain('**Interest profile:** AI agents and developer tools')
    expect(text).toContain('**Title:** Agents SDK launch')
    expect(text).toContain('**URL:** https://example.com/agents')
    expect(text).toContain('**Snippet:** OpenAI released a new Agents SDK')
    expect(text).toContain('**Score reason:** Matches interest in AI agents')
    // Same-line profile must not swallow instruction prose
    expect(text).not.toContain('Write exactly ONE concise sentence')
  })

  it('shows User text for extract_context (Return ONLY JSON), not the schema', () => {
    const prompt = `Extract a personal work Context as JSON from the user text.

Return ONLY JSON:
{
  "profile": { "role": "", "summary": "" },
  "projects": [ { "name": "", "type": "", "stack": [] } ],
  "technologies": [],
  "interests": [],
  "goals": [],
  "preferences": {}
}

User text:
I am a backend engineer working on RAG pipelines and evaluation.`

    const { text, isStructured } = formatAiMonitorBody(prompt, {
      kind: 'input',
      operation: 'extract_context',
    })
    expect(isStructured).toBe(true)
    expect(text).toContain('backend engineer')
    expect(text).toContain('RAG pipelines')
    expect(text).not.toContain('"projects"')
  })

  it('shows Content for web-extract (Return JSON:), not the schema', () => {
    const prompt = `Extract news or story items from the content below.

Instruction from the user:
Pull AI product launches only

Return JSON:
{
  "items": [
    { "title": "...", "url": "https://...", "content": "short summary" }
  ]
}

Rules:
- Return at most 10 items.

Content:
Company X launched an AI coding agent today. It supports multi-file edits.`

    const { text, isStructured } = formatAiMonitorBody(prompt, {
      kind: 'input',
      operation: 'web-extract',
    })
    expect(isStructured).toBe(true)
    expect(text).toContain('Pull AI product launches only')
    expect(text).toContain('Company X launched an AI coding agent')
    expect(text).not.toContain('Return at most 10 items')
  })

  it('falls back to truncated raw when nothing labeled', () => {
    const prompt = 'x'.repeat(600)
    const { text, isStructured } = formatAiMonitorBody(prompt, {
      kind: 'input',
      operation: 'unknown',
    })
    expect(isStructured).toBe(false)
    expect(text).toHaveLength(501) // 500 + ellipsis
    expect(text.endsWith('…')).toBe(true)
  })

  it('shows Item and Candidate events for assign_event', () => {
    const prompt = `# Assign news item to an existing event or create a new event.

Interest profile: AI agents

Item:
- title: Agents SDK launch
- url: https://example.com/agents
- snippet: OpenAI released Agents SDK

Candidate events (JSON):
[{"id":1,"title":"OpenAI Agents rollout"}]

Return JSON only:
{
  "createNew": true
}

Rules:
- Prefer assign when the item clearly continues the same story.
`

    const { text, isStructured } = formatAiMonitorBody(prompt, {
      kind: 'input',
      operation: 'assign_event',
    })
    expect(isStructured).toBe(true)
    expect(text).toContain('**Interest profile:** AI agents')
    expect(text).toContain('Agents SDK launch')
    expect(text).toContain('https://example.com/agents')
    expect(text).toContain('OpenAI Agents rollout')
    expect(text).not.toContain('Prefer assign when the item')
  })

  it('shows User context JSON and Existing impact note for analyze_impact', () => {
    const prompt = `Analyze how this Change impacts the user's Context. Return ONLY JSON:
{
  "relevance": 0-100,
  "why": "why the user should care",
  "recommendation": "what to do next"
}

Memory hints (may be empty):
watched Agents SDK last week

User context JSON:
{"role":"backend engineer","stack":["Java"]}

Change title: Agents SDK launch
Change summary: OpenAI released a new Agents SDK
Existing impact note: May affect our agent scaffolding
`

    const { text, isStructured } = formatAiMonitorBody(prompt, {
      kind: 'input',
      operation: 'analyze_impact',
    })
    expect(isStructured).toBe(true)
    expect(text).toContain('watched Agents SDK last week')
    expect(text).toContain('backend engineer')
    expect(text).toContain('**Change title:** Agents SDK launch')
    expect(text).toContain('May affect our agent scaffolding')
    expect(text).not.toContain('why the user should care')
  })

  it('shows User context / Why / Recommendation for suggest_opportunity', () => {
    const prompt = `Given a high-impact change and user context, suggest one opportunity.
Return ONLY JSON:
{
  "kind": "OPPORTUNITY|RISK",
  "title": ""
}

User context:
Building RAG evaluation tooling

Change title: New embedding model
Why: Better recall on long docs
Recommendation: Re-benchmark retrieval
`

    const { text, isStructured } = formatAiMonitorBody(prompt, {
      kind: 'input',
      operation: 'suggest_opportunity',
    })
    expect(isStructured).toBe(true)
    expect(text).toContain('Building RAG evaluation tooling')
    expect(text).toContain('**Change title:** New embedding model')
    expect(text).toContain('Better recall on long docs')
    expect(text).toContain('Re-benchmark retrieval')
  })

  it('shows Interest, Event title, and Member items for event_intelligence', () => {
    const prompt = `# Refresh event intelligence fields.

Language: zh
Interest: AI agents

Event title: OpenAI Agents rollout

Member items (JSON):
[{"title":"Agents SDK launch"},{"title":"Cookbook update"}]

Return JSON only:
{
  "summary": "..."
}
`

    const { text, isStructured } = formatAiMonitorBody(prompt, {
      kind: 'input',
      operation: 'event_intelligence',
    })
    expect(isStructured).toBe(true)
    expect(text).toContain('**Interest profile:** AI agents')
    expect(text).toContain('**Event title:** OpenAI Agents rollout')
    expect(text).toContain('Agents SDK launch')
    expect(text).toContain('Cookbook update')
  })
})
