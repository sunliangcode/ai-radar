# Release checklist

Ship process for AI Radar (self-hosted, MIT). Aligns with Keep a Changelog + SemVer.

Do **not** tag until the checklist passes.

## Pre-flight

1. `./scripts/check.sh` — all green (backend tests, frontend lint/test/build, mcp + cli syntax)
2. Optional smoke (running backend): `./scripts/smoke-extensibility.sh`, `./bin/ai-radar doctor` (watch soft `modelPresent` and SPI `connectors` / `deliveryChannels`), `./bin/ai-radar health`, and `./bin/ai-radar health-llm`. Optional: `./bin/ai-radar backup` (check `BACKUP_KEEP` prune).
3. Move `[Unreleased]` notes in [`CHANGELOG.md`](../CHANGELOG.md) under a dated `## [x.y.z] - YYYY-MM-DD` section
4. Bump versions **together** (same `x.y.z`):

| Surface | File | Field |
| --- | --- | --- |
| Backend | `backend/pom.xml` | `<version>` |
| OpenAPI / health | `backend/.../application.yml` | `radar.api.version` (also returned by `GET /api/health`) |
| Frontend | `frontend/package.json` | `"version"` |
| MCP | `mcp/package.json` | `"version"` |
| CLI | `cli/package.json` | `"version"` (CLI reads it at runtime; do not hardcode) |
| MCP server | `mcp/package.json` | `"version"` (server metadata reads it at runtime) |
| Citation | `CITATION.cff` | `version:` |

CI enforces alignment via [`shared/version-sync.test.mjs`](../shared/version-sync.test.mjs).
The root [`Dockerfile`](../Dockerfile) copies `backend-*.jar` (wildcard) and builds the SPA on **Node 20** ([`shared/docker-sync.test.mjs`](../shared/docker-sync.test.mjs)).
Argos Translate pin: bump `translate-service/requirements.txt` and [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) together ([`shared/argos-version-sync.test.mjs`](../shared/argos-version-sync.test.mjs)).

### SNAPSHOT policy (backend)

| On branch / state | `backend/pom.xml` version |
| --- | --- |
| Day-to-day `main` between cuts | `x.y.z-SNAPSHOT` (e.g. `0.1.0-SNAPSHOT`) |
| Commit that becomes tag `vx.y.z` | drop `-SNAPSHOT` → `x.y.z`, then tag |
| Right after the tag on `main` | bump to next `a.b.c-SNAPSHOT` |

Frontend / mcp / cli stay on plain `x.y.z` (no SNAPSHOT); bump them on the same release commit as the pom.

5. Update [`SECURITY.md`](../SECURITY.md) supported-versions table if the major/minor support window changes
6. Commit on `main` with message like `release: v0.2.0`

## Tag and GitHub Release

```bash
git tag -a v0.2.0 -m "v0.2.0"
git push origin v0.2.0
```

Pushing a `v*` tag runs [`.github/workflows/release.yml`](../.github/workflows/release.yml): a **check** job (backend tests + frontend lint/test/build + shared/cli/mcp gates, including offline `doctor`/`cliVersion`) must pass before the GitHub Release is created. The workflow uses `concurrency` per tag so overlapping tag pushes do not race. Tags containing `-` (e.g. `v0.2.0-rc.1`) are marked **prerelease**.

Manual fallback:

```bash
gh release create v0.2.0 --title "v0.2.0" --notes-file - <<'EOF'
See CHANGELOG.md for details.
EOF
```

## After release

1. On `main`, set backend back to `x.y.z-SNAPSHOT` (or next minor SNAPSHOT) if you use SNAPSHOT between cuts
2. Ensure CHANGELOG has a fresh empty `## [Unreleased]` section with `### Added` / `### Changed` / `### Fixed` stubs as needed
3. Confirm compare links at the bottom of CHANGELOG resolve

## What we do **not** publish (yet)

- No Maven Central / npm package for the app itself (consumers clone or use Docker)
- No PyPI artifact
- Docker Hub image publish is optional and out of band of this checklist

## Related

- [CHANGELOG.md](../CHANGELOG.md) · [CONTRIBUTING.md](../CONTRIBUTING.md) · [development.md](development.md)
- [SECURITY.md](../SECURITY.md) · [SUPPORT.md](../SUPPORT.md) · [installation.md](installation.md)
