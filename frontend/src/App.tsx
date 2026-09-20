import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PrefsProvider, EmptyState, ListSkeleton, ToastProvider } from './components/ui'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Sidebar } from './components/layout/Sidebar'
import { CommandPalette } from './components/CommandPalette'
import { EngagementProvider } from './hooks/useEngagement'
import { DisplaySourcesProvider } from './hooks/useDisplaySources'
import { useSources } from './hooks/useSources'
import { useDisplaySources } from './hooks/useDisplaySources'
import { useUnreadCounts } from './hooks/useUnreadCounts'
import { cn, focusRingClass } from './lib/cn'

// Route-level code splitting: each page is a separate chunk so the shell and
// Today page load without pulling in every other route's code.
const BriefDetailPage = lazy(() => import('./pages/BriefDetailPage'))
const ChangeDetailPage = lazy(() => import('./pages/ChangeDetailPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ContextsPage = lazy(() => import('./pages/ContextsPage'))
const RadarPage = lazy(() => import('./pages/RadarPage'))
const DecisionsPage = lazy(() => import('./pages/DecisionsPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const SettingsHubPage = lazy(() => import('./pages/SettingsHubPage'))
const SourceDetailPage = lazy(() => import('./pages/SourceDetailPage'))
const SourcesPage = lazy(() => import('./pages/SourcesPage'))
const TodayPage = lazy(() => import('./pages/TodayPage'))
const AiMonitorPage = lazy(() => import('./pages/AiMonitorPage'))
const BriefsPage = lazy(() => import('./pages/BriefsPage'))
const ActionsPage = lazy(() => import('./pages/ActionsPage'))

function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <EmptyState
      title={t('common.notFound')}
      description={t('common.notFoundHint')}
      primary={
        <Link
          to="/"
          className={cn(
            'inline-flex min-h-10 items-center rounded-md text-sm font-medium text-accent hover:underline',
            focusRingClass(),
          )}
        >
          {t('common.backToToday')}
        </Link>
      }
    />
  )
}

function PageFallback() {
  return <ListSkeleton rows={4} />
}

function Shell() {
  const { t } = useTranslation()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-[max(1rem,env(safe-area-inset-left))] focus:top-[max(1rem,env(safe-area-inset-top))] focus:z-[70] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-lg focus:ring-2 focus:ring-accent/40 focus:outline-none"
      >
        {t('common.skipToContent')}
      </a>
      <Sidebar
        totalUnread={totalUnread}
        unreadByType={unread.data ?? {}}
        sourceTypes={sourceTypes}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <main
        id="main-content"
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
                <Route path="/radar" element={<RadarPage />} />
                <Route path="/decisions" element={<DecisionsPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/actions" element={<ActionsPage />} />
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
                {/* Soft redirects — IA contraction keeps deep links alive */}
                <Route path="/explore" element={<Navigate to="/radar" replace />} />
                <Route path="/feed" element={<Navigate to="/radar" replace />} />
                <Route path="/items" element={<Navigate to="/radar" replace />} />
                <Route path="/events" element={<Navigate to="/radar" replace />} />
                <Route path="/changes" element={<Navigate to="/radar?view=changes" replace />} />
                <Route path="/watching" element={<Navigate to="/" replace />} />
                <Route path="/contexts" element={<Navigate to="/settings/context" replace />} />
                <Route path="/sources" element={<Navigate to="/settings/sources" replace />} />
                <Route path="/sources/:id" element={<SourceIdRedirect />} />
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
