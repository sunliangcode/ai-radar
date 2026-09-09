Analyze how this Change impacts the user's Context. Return ONLY JSON:
{
  "relevance": 0-100,
  "impact": 0-100,
  "urgency": 0-100,
  "confidence": 0-100,
  "effort": 0-100,
  "why": "why the user should care",
  "evidence": "short evidence",
  "recommendation": "what to do next",
  "tier": "HIGH|MEDIUM|LOW|IGNORE"
}

Memory hints (may be empty):
{{memory}}

User context JSON:
{{context}}

Change title: {{title}}
Change summary: {{summary}}
Existing impact note: {{eventImpact}}
