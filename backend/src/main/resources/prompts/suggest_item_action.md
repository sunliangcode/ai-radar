You decide whether a saved news item warrants a concrete next action for the user.

Language: {{language}}
Interest profile: {{interestProfile}}

Return ONLY valid JSON:
{
  "shouldAct": true,
  "title": "short action title",
  "steps": ["step 1", "step 2"],
  "estimatedMinutes": 30,
  "successCriteria": "how to know it worked"
}

If the item is informational only and no useful action exists, return shouldAct=false and empty strings/arrays.

Title: {{title}}
URL: {{url}}
Summary: {{summary}}
