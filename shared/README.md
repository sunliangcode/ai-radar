# shared/

Zero-dependency Node helpers used by the **CLI** and **MCP** sidecar (and CI inventory gates).

| Module | Role |
| --- | --- |
| `errors.mjs` | Actionable CLI/MCP error messages (`request_timeout`, unreachable, …) |
| `http.mjs` | `apiBaseUrl` + `requestTimeoutSignal` / `DEFAULT_REQUEST_TIMEOUT_MS` (8000) / `DEFAULT_JOB_TIMEOUT_MS` (0); env `AI_RADAR_TIMEOUT_MS` overrides (`0` / invalid disables; empty/unset/whitespace → per-call fallback) |
| `pack.mjs` | Pack JSON validate + `SOURCE_TYPES` / `LEGACY_SOURCE_TYPES` (soft-warns data-driven from `BUILTIN_CONNECTOR_PAIRS`; CI via `pack-builtin-fields-sync.test.mjs`) |
| `version-align.mjs` | Doctor CLI↔API SemVer check |
| `llm-mode.mjs` | Doctor LLM mode (`ai` / `heuristic` / `degraded`) |
| `model-present.mjs` | Doctor soft-warn when `health/llm` `modelPresent` is false |
| `translate-status.mjs` | Doctor Argos translate status |
| `spi-catalog.mjs` | Doctor soft-checks for connector/delivery SPI catalogs (sorted/unique/no padded ids; ≥19 connectors; `BUILTIN_CONNECTOR_PAIRS` = FIXTURE/path + `BUILTIN_CONNECTOR_FIELDS`; delivery `BUILTIN_DELIVERY_SETTINGS` / `healthyDeliveryCatalog`; `connectorFieldType` / `formatBuiltin*Expect` (CLI+MCP) / `formatBuiltin*Ticks` (docs); field types `text`/`path`/`secret`/`textarea`). CI syncs frontend checks, `SpiCatalogBlurbs`, OpenAPI/docs, and delivery beans to the same tables. |
| `check-spi-catalog.mjs` | CLI wrapper used by `smoke-extensibility.sh` / `status.sh` (`connectors` \| `delivery` JSON on stdin) |

Tests: `*.test.mjs` (SourceType sync, connector/delivery inventory + unique ids, pack-files-sync for `packs/sources` + `examples/packs`, version/engines/CITATION, Argos pin ↔ notices, Docker/CI Node pin, docs links, MCP tools, skills copies, ops `health-llm` hints, region UI, i18n health issueKeys + en/zh leaf parity + no duplicate JSON keys). Run all of them:

```bash
cd shared && node --test *.test.mjs
# or from repo root:
make check
```
