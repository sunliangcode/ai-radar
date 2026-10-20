# Governance

AI Radar is a small, MIT-licensed, **single-maintainer** project. This document states how decisions are made so contributors know what to expect.

## Roles

| Role | Who | Responsibility |
| --- | --- | --- |
| Maintainer | [@sunliangcode](https://github.com/sunliangcode) | Roadmap, merge rights, releases, security triage, CoC enforcement |
| Contributor | Anyone with a merged PR or substantial review | Propose changes via issues / PRs; no commit access required |

Canonical list: [MAINTAINERS](MAINTAINERS). There is no separate steering committee or corporate sponsor governing the codebase.

## Decision process

1. **Day-to-day** — The maintainer merges PRs that pass CI (`make check` / release workflow), match [CONTRIBUTING.md](CONTRIBUTING.md), and fit the product loop in [docs/ai-radar-2.0-domain.md](docs/ai-radar-2.0-domain.md) and [docs/product-principles.md](docs/product-principles.md).
2. **Breaking or large changes** — Prefer an issue first (motivation, alternatives, migration). The maintainer may defer or reshape scope.
3. **Security** — Private disclosure via [SECURITY.md](SECURITY.md); public issues are not used for vulnerabilities.
4. **Conduct** — [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md); enforcement contact is the maintainer.

Silence is not consent to ship: open questions stay open until the maintainer accepts or closes them.

## Releases

Versioning and tagging follow [docs/release.md](docs/release.md) (Keep a Changelog + SemVer; aligned package / API / `CITATION.cff` versions). Only the maintainer cuts tags.

## Changes to this document

Governance updates land like any other PR, with a short note in `CHANGELOG.md` under **Changed**.
