import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

/** Map route prefixes (longest first) to i18n nav/page title keys. */
const ROUTE_TITLES: Array<{ prefix: string; key: string }> = [
  { prefix: '/settings/sources/', key: 'sources.title' },
  { prefix: '/settings/sources', key: 'nav.sources' },
  { prefix: '/settings/context', key: 'contexts.title' },
  { prefix: '/settings/system', key: 'nav.monitor' },
  { prefix: '/settings', key: 'nav.settings' },
  { prefix: '/changes/', key: 'changes.listTitle' },
  { prefix: '/changes', key: 'changes.listTitle' },
  { prefix: '/briefs/', key: 'nav.briefs' },
  { prefix: '/briefs', key: 'nav.briefs' },
  { prefix: '/actions', key: 'nav.actions' },
  { prefix: '/watching', key: 'watching.title' },
  { prefix: '/decisions', key: 'nav.decisions' },
  { prefix: '/radar', key: 'nav.radar' },
  { prefix: '/chat', key: 'nav.chat' },
  { prefix: '/', key: 'nav.today' },
]

function isDetailPath(pathname: string) {
  return (
    /^\/changes\/[^/]+$/.test(pathname) ||
    /^\/briefs\/[^/]+$/.test(pathname) ||
    /^\/settings\/sources\/\d+$/.test(pathname)
  )
}

function titleForPath(pathname: string, t: (key: string) => string): string {
  const brand = t('nav.brand')
  const match = ROUTE_TITLES.find(
    (r) => pathname === r.prefix || (r.prefix !== '/' && pathname.startsWith(r.prefix)),
  )
  const page = match ? t(match.key) : null
  return page ? `${page} · ${brand}` : brand
}

/**
 * Keep the browser tab title in sync (`Page · Brand`).
 *
 * - Shell: `useDocumentTitle()` — path-based; skips detail routes.
 * - Detail: `useDocumentTitle({ title: entity ?? null })` — entity when loaded,
 *   interim section title while `null`.
 */
export function useDocumentTitle(opts?: { title?: string | null }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const isShell = opts === undefined
  const override = opts?.title

  useEffect(() => {
    if (isShell) {
      if (isDetailPath(pathname)) return
      document.title = titleForPath(pathname, t)
      return
    }
    if (override) {
      document.title = `${override} · ${t('nav.brand')}`
      return
    }
    document.title = titleForPath(pathname, t)
  }, [pathname, override, t, isShell])
}
