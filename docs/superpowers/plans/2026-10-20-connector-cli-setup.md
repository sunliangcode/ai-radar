# Connector CLI Setup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sources UI can detect CLI-backed source readiness; when CLI is missing/broken, Install clones/packages the OSS CLI by default (no AI), sets `cliPath`, prompts for Cookie, probes until success or clear failure.

**Architecture:** Optional `CliSetupSupport` on ZHIHU/WEIBO/BILIBILI; `CliSetupService` owns status/install/probe; source-scoped REST under `/api/sources/{id}/setup*`; frontend Sources row chip + Install wizard (no AI gate).

**Tech Stack:** Java 21 / Spring Boot 3, React 19 + vitest, existing `OpenSourceCliRunner` / `CliCredentialWriter`.

## Global Constraints

- Backend tests stay plain unit tests (no `@SpringBootTest`).
- Install allowlists repo URLs and PyPI package names in connector code (never client-supplied).
- Install does not require or call the LLM.
- User-visible changes → `CHANGELOG.md`.
- Do not commit unless the user asks.

---

## File map

| Path | Role |
|------|------|
| `backend/.../connector/CliSetupSupport.java` | SPI interface |
| `backend/.../connector/CliSetupRecipe.java` | Immutable install metadata |
| `backend/.../connector/ProbeResult.java` | Probe outcome record |
| `backend/.../connector/CliSetupService.java` | Status / install / probe orchestration |
| `backend/.../connector/CliPackageInstaller.java` | uv/pipx/pip + clone fallback |
| `backend/.../api/SourceSetupController.java` | REST endpoints |
| `backend/.../connector/{Zhihu,Weibo,Bilibili}Connector.java` | Implement SPI; Zhihu portable default |
| `backend/.../connector/CliCredentialWriter.java` | Add Zhihu cookies.json writer |
| `frontend/src/lib/api.ts` | Client methods + types |
| `frontend/src/pages/sources/SourceList.tsx` | Chip + Install button |
| `frontend/src/pages/sources/SourceSetupWizard.tsx` | Modal wizard |
| `frontend/src/pages/SourcesPage.tsx` | Wire health + wizard |
| `frontend/src/i18n/locales/{en,zh}.json` | Copy |
| `docs/api.md`, `docs/extending-connectors.md`, `docs/sources.md`, `CHANGELOG.md` | Docs |

---

### Task 1: ProbeResult + CliSetupRecipe + unit tests for classification

**Files:**
- Create: `backend/src/main/java/com/airadar/connector/ProbeResult.java`
- Create: `backend/src/main/java/com/airadar/connector/CliSetupRecipe.java`
- Create: `backend/src/main/java/com/airadar/connector/CliSetupSupport.java`
- Test: `backend/src/test/java/com/airadar/connector/ProbeResultClassifyTest.java`

- [ ] **Step 1:** Add records/interface:

```java
public record ProbeResult(String state, String reason) {
  public static final String OK = "ok";
  public static final String NEED_COOKIE = "need_cookie";
  public static final String CLI_MISSING = "cli_missing";
  public static final String FAILED = "failed";
  public static ProbeResult ok() { return new ProbeResult(OK, ""); }
  public static ProbeResult needCookie(String reason) { return new ProbeResult(NEED_COOKIE, reason); }
  public static ProbeResult cliMissing(String reason) { return new ProbeResult(CLI_MISSING, reason); }
  public static ProbeResult failed(String reason) { return new ProbeResult(FAILED, reason); }
  /** Map CLI stderr/message → need_cookie vs failed. */
  public static ProbeResult fromCliFailure(String detail) { /* auth keywords → need_cookie */ }
}

public record CliSetupRecipe(
  String repoUrl, String pypiPackage, String binaryName,
  String installRelPath, List<List<String>> buildCommands
) {}

public interface CliSetupSupport {
  CliSetupRecipe setupRecipe();
  void writeCookie(String cookieHeader);
  String resolveCliPath(Map<String, Object> sourceConfig);
  ProbeResult probe(String cliPath);
}
```

- [ ] **Step 2:** Unit-test `fromCliFailure` for auth vs generic failures.
- [ ] **Step 3:** Run `./mvnw -Dtest=ProbeResultClassifyTest test` — pass.

---

### Task 2: CliPackageInstaller (mockable process runner)

**Files:**
- Create: `backend/src/main/java/com/airadar/connector/CliPackageInstaller.java`
- Test: `backend/src/test/java/com/airadar/connector/CliPackageInstallerTest.java`

- [ ] Prefer: `uv tool install <pkg>` → `pipx install <pkg>` → `python3 -m pip install --user <pkg>`.
- [ ] Resolve binary with `which`/`command -v` equivalent.
- [ ] Fallback: clone `repoUrl` to `~/.ai-radar/clis/<binary>/` + run `buildCommands`.
- [ ] Tests inject a fake runner; never hit network in CI.

---

### Task 3: CliSetupService + SourceSetupController

**Files:**
- Create: `backend/src/main/java/com/airadar/connector/CliSetupService.java`
- Create: `backend/src/main/java/com/airadar/api/SourceSetupController.java`
- Test: `backend/src/test/java/com/airadar/connector/CliSetupServiceTest.java`

**Status DTO fields:** `supported`, `state` (`ready|cli_missing|need_cookie|unreachable|unsupported`), `cliPath`, `installAvailable`, `reason`, `openSourceUrl`.

**Endpoints:**
- `GET /api/sources/{id}/setup`
- `POST /api/sources/{id}/setup/install`
- `POST /api/sources/{id}/setup/probe` body `{ cookie?: string }`

`installAvailable = supported && state != ready` (no AI required).

On install success: merge `cliPath` into source `configJson`, save. On probe ok after cookie: write cookie, optionally enable source (caller/FE).

---

### Task 4: Wire WEIBO / BILIBILI / ZHIHU

**Files:** modify three connectors + `CliCredentialWriter` (+ Zhihu cookies writer) + fix Zhihu `DEFAULT_CLI` to `"zhihu"` + `OPEN_SOURCE_URL`.

| Type | pypi | binary | probe |
|------|------|--------|-------|
| WEIBO | kabi-weibo-cli | weibo | `hot --json --count 1` |
| BILIBILI | bilibili-cli | bili | `hot --max 1 --json` |
| ZHIHU | pyzhihu-cli | zhihu | `feeds --json --limit 1` |

Update `SourceSeederTest` expectations if they assert the old absolute path.

---

### Task 5: Frontend API + wizard + Sources list

**Files:** `api.ts`, `SourceSetupWizard.tsx`, `SourceList.tsx`, `SourcesPage.tsx`, i18n.

- Fetch setup status for CLI types (or all sources with type in set).
- Show Install when `installAvailable`.
- Wizard: install → cookie → probe → enable on success.
- Gate hint when LLM not ready.

---

### Task 6: Docs + CHANGELOG + verify

- Update `docs/api.md`, `docs/extending-connectors.md`, `docs/sources.md`, `CHANGELOG.md`.
- Run: `cd backend && ./mvnw -Dtest=ProbeResultClassifyTest,CliPackageInstallerTest,CliSetupServiceTest,ZhihuConnectorTest,WeiboConnectorTest,BilibiliConnectorTest,SourceSeederTest test`
- Run: `cd frontend && npx vitest run` (setup-related tests) + oxlint on touched files.

---

## Spec coverage

| Spec requirement | Task |
|------------------|------|
| Reachability per source | 3 |
| Install without AI | 3, 5 |
| Auto download + path | 2, 3, 4 |
| Cookie dialog + probe | 3, 5 |
| Connector audit | 4 (only trio) |
| Zhihu portable default | 4 |
| Frontend UI | 5 |
| Docs/tests | 1–6 |
