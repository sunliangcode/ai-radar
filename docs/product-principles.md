# Product principles

Norms for user-facing work. Aligns the SPA with a mature single-user product bar (clear states, reversible actions, consistent filters) without multi-tenant SaaS assumptions.

Domain vocabulary: [ai-radar-2.0-domain.md](ai-radar-2.0-domain.md). Privacy posture: [PRIVACY.md](../PRIVACY.md).

## Mental model

Keep the loop obvious:

```text
Context → Signal → Change → Decision → Review on Today
```

Primary nav stays lean (**Today · Radar · Decisions · Chat · Settings**). Following / Actions / Briefs are reachable but not competing home pages.

## Interaction norms

| Norm | Expectation |
| --- | --- |
| **Reversible mutations** | Destructive or hard-to-recover actions (dismiss, unfollow, mark-all read, decision/context/settings save, status change, source toggle, feedback) offer **toast Undo** where the API allows restore; irreversible external delivery (manual brief push) requires **confirm** |
| **Optimistic UI** | List/home badges update immediately; rollback on failure or Undo |
| **Escape** | Prefer history back on detail / hub subpages; clear drafts where relevant (e.g. Chat) |
| **Display filter** | 国内 / 国外 / 自定义源 scope applies consistently to unread badges, Feed, Today, empty states, and mark-all — never “inbox zero” by ignoring filter |
| **Pull-to-refresh** | Soft refetch on Today / Radar / Following / Decisions / Actions / Briefs (lists/home/unread); do not silently start a full fetch job (use explicit **Update**) |

## Empty / error / loading

Distinguish these; do not reuse the “getting started” empty for filter-empty or 404:

| State | UX |
| --- | --- |
| **True empty** | Explain what is missing; one primary CTA (e.g. import pack, open Sources) |
| **Filter / display-none empty** | Say the filter hid everything; offer restore-all or widen scope |
| **Not found (404)** | Dedicated not-found; no retry loop |
| **Network / server error** | Retry + keep prior content when safe |
| **Loading** | Skeleton or busy region with `aria-busy` where interactive |

## Accessibility & i18n

- Interactive controls: visible focus, adequate touch targets, `aria-*` / pressed state for toggles and filters.
- Respect `prefers-reduced-motion` for non-essential motion.
- User-visible strings go through i18n (`en` / `zh` leaf parity is CI-gated in `shared/`).
- Prefer localized badges/labels over raw enum strings (e.g. tier `HIGH`).
- Baseline primitives (ConfirmDialog modal + focus trap, `a11y.ts`, reduced-motion CSS) are CI-gated by `shared/a11y-baseline.test.mjs`.

## Self-host product bar

- No phone-home analytics (see PRIVACY).
- Settings → System is for diagnostics (health / AI monitor), not growth funnels.
- Secrets stay in Settings / `.env`; never in pack JSON committed to git.

## Checklist for PRs that touch UI

- [ ] Empty vs filter-empty vs error vs 404 are distinct
- [ ] Mutation has Undo or an explicit confirm when irreversible
- [ ] Display `sourceIds` / unread scope still consistent
- [ ] `en.json` + `zh.json` updated together
- [ ] `CHANGELOG.md` note under Unreleased if user-visible
