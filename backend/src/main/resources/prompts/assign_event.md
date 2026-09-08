# Assign news item to an existing event or create a new event.

Interest profile: {{interestProfile}}

Item:
- title: {{title}}
- url: {{url}}
- snippet: {{snippet}}

Candidate events (JSON):
{{candidatesJson}}

Return JSON only:
{
  "createNew": true|false,
  "eventId": null|number,
  "title": "event title if createNew or refined title",
  "confidence": 0.0-1.0,
  "reason": "short reason"
}

Rules:
- Prefer assign when the item clearly continues the same story (same product/model/company release thread).
- If confidence < 0.55, set createNew=true.
- eventId must be one of the candidate ids when createNew=false.
