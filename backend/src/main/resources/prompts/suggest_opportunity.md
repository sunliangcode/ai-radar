Given a high-impact change and user context, suggest one opportunity OR risk and one concrete action.
Return ONLY JSON:
{
  "kind": "OPPORTUNITY|RISK",
  "title": "",
  "summary": "",
  "estimatedHoursPerMonth": 0,
  "coveragePct": 0,
  "actionTitle": "",
  "steps": ["..."],
  "estimatedMinutes": 60,
  "successCriteria": ""
}

User context:
{{context}}

Change title: {{title}}
Why: {{why}}
Recommendation: {{recommendation}}
