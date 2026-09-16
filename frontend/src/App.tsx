import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PrefsProvider, StateBox, ToastProvider } from './components/ui'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Sidebar } from './components/layout/Sidebar'
import { CommandPalette } from './components/CommandPalette'
import { EngagementProvider } from './hooks/useEngagement'
import { DisplaySourcesProvider } from './hooks/useDisplaySources'
import { useSources } from './hooks/useSources'
import { useDisplaySources } from './hooks/useDisplaySources'
import { useUnreadCounts } from './hooks/useUnreadCounts'

// Route-level code splitting: each page is a separate chunk so the shell and
// Today page load without pulling in every other route's code.
const BriefDetailPage = lazy(() => import('./pages/BriefDetailPage'))
const ChangeDetailPage = lazy(() => import('./pages/ChangeDetailPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ContextsPage = lazy(() => import('./pages/ContextsPage'))
const FeedPage = lazy(() => import('./pages/FeedPage'))
const ChangesPage = lazy(() => import('./pages/ChangesPage'))
const DecisionsPage = lazy(() => import('./pages/DecisionsPage'))
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
  const { isDisplayed } = useDisplaySources()

  const visibleSources = useMemo(
    () => (sources.data ?? []).filter((s) => s.enabled && isDisplayed(s.id)),
    [sources.data, isDisplayed],
  )

  const totalUnread = useMemo(() => {
    const m = unread.data ?? {}
    const visibleTypes = new Set(visibleSources.map((s) => s.type))
    return Object.entries(m).reduce(
      (sum, [type, count]) => sum + (visibleTypes.has(type) ? count : 0),
      0,
    )
  }, [unread.data, visibleSources])

  const sourceTypes = useMemo(() => {
    const seen = new Map<string, number>()
    for (const s of visibleSources) {
      if (s.type) seen.set(s.type, (seen.get(s.type) ?? 0) + 1)
    }
    return Array.from(seen.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [visibleSources])

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
        <div className="mx-auto max-w-6xl">
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/monitor" element={<Navigate to="/settings/system" replace />} />
                <Route path="/" element={<TodayPage />} />
                <Route path="/explore" element={<FeedPage />} />
                <Route path="/feed" element={<Navigate to="/explore" replace />} />
                <Route path="/changes" element={<ChangesPage />} />
                <Route path="/decisions" element={<DecisionsPage />} />
                <Route path="/watching" element={<WatchingPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/actions" element={<Navigate to="/decisions" replace />} />
                <Route path="/briefs" element={<BriefsPage />} />
                <Route path="/settings" element={<SettingsHubPage />} />
                <Route path="/settings/system" element={<AiMonitorPage />} />
                <Route path="/settings/context" element={<ContextsPage />} />
                <Route path="/settings/sources" element={<SourcesPage />} />
                <Route path="/settings/sources/:id" element={<SourceDetailPage />} />
                <Route path="/settings/preferences" element={<SettingsPage />} />
                <Route path="/settings/llm" element={<Navigate to="/settings/preferences" replace />} />
                <Route path="/changes/:id" element={<ChangeDetailPage />} />
                <Route path="/briefs/:date" element={<BriefDetailPage />} />
                {/* Legacy redirects */}
                <Route path="/items" element={<Navigate to="/explore" replace />} />
                <Route path="/contexts" element={<Navigate to="/settings/context" replace />} />
                <Route path="/sources" element={<Navigate to="/settings/sources" replace />} />
                <Route path="/sources/:id" element={<SourceIdRedirect />} />
                <Route path="/events" element={<Navigate to="/explore" replace />} />
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
        <DisplaySourcesProvider>
          <EngagementProvider>
            <Shell />
          </EngagementProvider>
        </DisplaySourcesProvider>
      </ToastProvider>
    </PrefsProvider>
  )
}
