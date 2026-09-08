# PackManifest draft (marketplace pre-bury)

This step does **not** implement an online marketplace, signatures, or paid packs.

Future shape:

```json
{
  "name": "ai-core",
  "version": "0.1.0",
  "license": "MIT",
  "connectors": ["RSS", "HACKER_NEWS", "FIXTURE"],
  "sources": "sources/ai-core.json",
  "profiles": ["profiles/builder.md"],
  "author": "local"
}
```

Today: import via `POST /api/packs/import` with `{ "packId": "ai-core" }` reading `packs/sources/*.json` + optional `packs/profiles/*.md`.
