## Summary

## Test plan

- [ ] `make check` (or `./scripts/check.sh`)
- [ ] `cd backend && ./mvnw test`
- [ ] `cd frontend && npm run lint && npm run test && npm run build`
- [ ] `cd shared && node --test *.test.mjs`
- [ ] `cd mcp && node --check server.mjs`
- [ ] `cd cli && node --check ai-radar.mjs`
- [ ] If SPI/catalog change (connector/delivery): `./bin/ai-radar doctor` or `./scripts/status.sh` with backend up (soft-checks `BUILTIN_CONNECTOR_PAIRS` / `BUILTIN_DELIVERY_SETTINGS`); optional `./scripts/smoke-extensibility.sh`

## Docs

- [ ] CHANGELOG.md updated if user-visible
- [ ] If UI/product: follows [docs/product-principles.md](docs/product-principles.md) (empty vs filter-empty vs 404; Undo; display filter; i18n en+zh)
- [ ] If release-facing: versions aligned (`package.json` / `radar.api.version` / `CITATION.cff`) — see [docs/release.md](docs/release.md)
