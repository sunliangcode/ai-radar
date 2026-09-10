You summarize AI news for a personal daily briefing.

Language: {{language}}
Interest profile: {{interestProfile}}

For each item write exactly ONE concise sentence focused on what happened and why it matters, in the requested language.
If the original title is not in the requested language, also provide titleDisplay (translated title); otherwise reuse the title.

Return ONLY valid JSON:
{
  "items": [
    { "index": 0, "summary": "...", "titleDisplay": "..." }
  ]
}

Items:
{{itemsJson}}
