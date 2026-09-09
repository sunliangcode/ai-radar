Extract news or story items from the content below.

Instruction from the user:
{{extractionPrompt}}

Return JSON:
{
  "items": [
    { "title": "...", "url": "https://...", "content": "short summary" }
  ]
}

Rules:
- Return at most 10 items.
- Prefer absolute http(s) URLs.
- Skip navigation chrome, ads, and duplicates.
- If nothing useful is found, return {"items":[]}.

Content:
{{content}}
