import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PrefsProvider, StateBox, ToastProvider } from './components/ui'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Sidebar } from './components/layout/Sidebar'
import { CommandPalette } from './components/CommandPalette'
import { useSources } from './hooks/useSources'
import { useUnreadCounts } from './hooks/useUnreadCounts'

// Route-level code splitting: each page is a separate chunk so the shell and
// Today page load without pulling in every other route's code.
const ActionsPage = lazy(() => import('./pages/ActionsPage'))
const BriefDetailPage = lazy(() => import('./pages/BriefDetailPage'))
const ChangeDetailPage = lazy(() => import('./pages/ChangeDetailPage'))
const ContextsPage = lazy(() => import('./pages/ContextsPage'))
const FeedPage = lazy(() => import('./pages/FeedPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const SettingsHubPage = lazy(() => import('./pages/SettingsHubPage'))
const SourceDetailPage = lazy(() => import('./pages/SourceDetailPage'))
const SourcesPage = lazy(() => import('./pages/SourcesPage'))
const TodayPage = lazy(() => import('./pages/TodayPage'))
const WatchingPage = lazy(() => import('./pages/WatchingPage'))
const AiMonitorPage = lazy(() => import('./pages/AiMonitorPage'))
const BriefsPage = lazy(() => import('./pages/BriefsPage'))

function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <StateBox>
      <h3 className="text-lg font-medium text-ink">{t('common.notFound')}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{t('common.notFoundHint')}</p>
      <Link to="/" className="mt-4 inline-block text-sm text-accent hover:underline">
        {t('common.backToToday')}
      </Link>
    </StateBox>
  )
}

function PageFallback() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      <div className="h-7 w-40 animate-pulse rounded bg-border/60" />
      <div className="h-4 w-64 max-w-full animate-pulse rounded bg-border/40" />
      <div className="h-40 animate-pulse rounded-lg bg-border/40" />
    </div>
  )
}

function Shell() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true })
  }, [location.pathname])

  const unread = useUnreadCounts()
  const sources = useSources()

  const totalUnread = useMemo(() => {
    const m = unread.data ?? {}
    return Object.values(m).reduce((a, b) => a + b, 0)
  }, [unread.data])

  const sourceTypes = useMemo(() => {
    const seen = new Map<string, number>()
    for (const s of sources.data ?? []) {
      if (s.type && s.enabled) seen.set(s.type, (seen.get(s.type) ?? 0) + 1)
    }
    return Array.from(seen.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [sources.data])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[230px_1fr] bg-bg text-ink">
      <Sidebar
        totalUnread={totalUnread}
        unreadByType={unread.data ?? {}}
        sourceTypes={sourceTypes}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <main
        ref={mainRef}
        tabIndex={-1}
        className="px-4 py-5 outline-none md:px-8 md:py-7"
      >
        <div className="mx-auto max-w-5xl">
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/monitor" element={<AiMonitorPage />} />
                <Route path="/" element={<TodayPage />} />
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/watching" element={<WatchingPage />} />
                <Route path="/settings" element={<SettingsHubPage />} />
                <Route path="/settings/context" element={<ContextsPage />} />
                <Route path="/settings/sources" element={<SourcesPage />} />
                <Route path="/settings/sources/:id" element={<SourceDetailPage />} />
                <Route path="/settings/preferences" element={<SettingsPage />} />
                <Route path="/settings/llm" element={<Navigate to="/settings/preferences" replace />} />
                <Route path="/changes/:id" element={<ChangeDetailPage />} />
                <Route path="/actions" element={<ActionsPage />} />
                <Route path="/briefs/:date" element={<BriefDetailPage />} />
                <Route path="/briefs" element={<BriefsPage />} />
                {/* Legacy redirects */}
                <Route path="/changes" element={<Navigate to="/feed" replace />} />
                <Route path="/items" element={<Navigate to="/feed" replace />} />
                <Route path="/contexts" element={<Navigate to="/settings/context" replace />} />
                <Route path="/sources" element={<Navigate to="/settings/sources" replace />} />
                <Route path="/sources/:id" element={<SourceIdRedirect />} />
                <Route path="/events" element={<Navigate to="/feed" replace />} />
                <Route path="/events/:id" element={<EventRedirect />} />
                {/* Unknown URLs used to render a blank main area with no explanation. */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}

function EventRedirect() {
  const { id } = useParams()
  return <Navigate to={`/changes/${id ?? ''}`} replace />
}

function SourceIdRedirect() {
  const { id } = useParams()
  return <Navigate to={`/settings/sources/${id ?? ''}`} replace />
}

export default function App() {
  return (
    <PrefsProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </PrefsProvider>
  )
}
