import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { PrefsProvider, EmptyState, ListSkeleton, ToastProvider } from './components/ui'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Sidebar } from './components/layout/Sidebar'
import { BottomTabBar } from './components/layout/BottomTabBar'
import { PullToRefresh } from './components/layout/PullToRefresh'
import { CommandPalette } from './components/CommandPalette'
import { EngagementProvider } from './hooks/useEngagement'
import { DisplaySourcesProvider } from './hooks/useDisplaySources'
import { useSources } from './hooks/useSources'
import { useDisplaySources } from './hooks/useDisplaySources'
import { useDecisionsDueCount } from './hooks/useDecisionsDueCount'
import { useUnreadCounts } from './hooks/useUnreadCounts'
import { useDocumentTitle } from './hooks/useDocumentTitle'
import { useEscapeBack } from './hooks/useEscapeBack'
import { prefersReducedMotion } from './lib/a11y'
import { cn, focusRingClass } from './lib/cn'

// Route-level code splitting: each page is a separate chunk so the shell and
// Today page load without pulling in every other route's code.
const BriefDetailPage = lazy(() => import('./pages/BriefDetailPage'))
const ChangeDetailPage = lazy(() => import('./pages/ChangeDetailPage'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const ContextsPage = lazy(() => import('./pages/ContextsPage'))
const RadarPage = lazy(() => import('./pages/RadarPage'))
const DecisionsPage = lazy(() => import('./pages/DecisionsPage'))
const SettingsHubPage = lazy(() => import('./pages/SettingsHubPage'))
const SourceDetailPage = lazy(() => import('./pages/SourceDetailPage'))
const SourcesPage = lazy(() => import('./pages/SourcesPage'))
const TodayPage = lazy(() => import('./pages/TodayPage'))
const AiMonitorPage = lazy(() => import('./pages/AiMonitorPage'))
const BriefsPage = lazy(() => import('./pages/BriefsPage'))
const ActionsPage = lazy(() => import('./pages/ActionsPage'))
const WatchingPage = lazy(() => import('./pages/WatchingPage'))

function NotFoundPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const goHome = useCallback(() => {
    navigate('/')
  }, [navigate])
  useEscapeBack(goHome)

  return (
    <EmptyState
      title={t('common.notFound')}
      description={t('common.notFoundHint')}
      primary={
        <Link
          to="/"
          aria-label={t('common.backToToday')}
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
  const [routeAnnounce, setRouteAnnounce] = useState('')
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  useDocumentTitle()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    mainRef.current?.focus({ preventScroll: true })
    const id = window.setTimeout(() => {
      setRouteAnnounce(document.title)
    }, 50)
    return () => window.clearTimeout(id)
  }, [location.pathname, location.search])

  const qc = useQueryClient()
  const unread = useUnreadCounts()
  const { count: decisionsDue } = useDecisionsDueCount()
  const sources = useSources()
  const { isDisplayed, noneSelected } = useDisplaySources()
  const canPullRefresh =
    location.pathname === '/' ||
    location.pathname === '/radar' ||
    location.pathname.startsWith('/radar') ||
    location.pathname === '/watching' ||
    location.pathname === '/decisions' ||
    location.pathname === '/actions' ||
    location.pathname === '/briefs'
  const [pullRefreshing, setPullRefreshing] = useState(false)

  const visibleSources = useMemo(
    () => (sources.data ?? []).filter((s) => s.enabled && isDisplayed(s.id)),
    [sources.data, isDisplayed],
  )

  // Badge total follows display scope (sourceIds), not a coarse source-type sum.
  const totalUnread = noneSelected ? 0 : Number(unread.data?.total ?? 0)

  const sourceTypes = useMemo(() => {
    const seen = new Map<string, number>()
    for (const s of visibleSources) {
      if (s.type) seen.set(s.type, (seen.get(s.type) ?? 0) + 1)
    }
    return Array.from(seen.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [visibleSources])

  const softRefresh = useCallback(async () => {
    setPullRefreshing(true)
    try {
      // Await active refetches so the pull indicator lasts until data is fresh.
      await Promise.all([
        qc.refetchQueries({ queryKey: ['intelligence-home'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['feed'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['watching-saved'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['watching-timeline'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['changes'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['changes-list'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['changes-watching'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['decisions'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['decisions-due'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['unread-counts'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['sources'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['actions'], type: 'active' }),
        qc.refetchQueries({ queryKey: ['briefs'], type: 'active' }),
      ])
    } finally {
      setPullRefreshing(false)
    }
  }, [qc])

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
        onClick={(e) => {
          e.preventDefault()
          mainRef.current?.focus({ preventScroll: false })
          mainRef.current?.scrollIntoView({
            block: 'start',
            behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          })
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-[max(1rem,env(safe-area-inset-left))] focus:top-[max(1rem,env(safe-area-inset-top))] focus:z-[70] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-lg focus:ring-2 focus:ring-accent/40 focus:outline-none"
      >
        {t('common.skipToContent')}
      </a>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {routeAnnounce}
      </div>
      <Sidebar
        totalUnread={totalUnread}
        decisionsDue={decisionsDue}
        unreadByType={unread.data ?? {}}
        sourceTypes={sourceTypes}
        onOpenPalette={() => setPaletteOpen(true)}
      />
      <main
        id="main-content"
        ref={mainRef}
        tabIndex={-1}
        className="route-enter px-4 py-5 pb-[calc(4.5rem+env(safe-area-inset-bottom))] outline-none md:px-8 md:py-7 md:pb-7"
      >
        <div className="mx-auto max-w-6xl">
          <ErrorBoundary>
            <Suspense fallback={<PageFallback />}>
              <PullToRefresh
                disabled={!canPullRefresh || pullRefreshing}
                onRefresh={softRefresh}
              >
              <Routes>
                <Route path="/monitor" element={<Navigate to="/settings/system" replace />} />
                <Route path="/" element={<TodayPage />} />
                <Route path="/radar" element={<RadarPage />} />
                <Route path="/decisions" element={<DecisionsPage />} />
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/actions" element={<ActionsPage />} />
                <Route path="/watching" element={<WatchingPage />} />
                <Route path="/briefs" element={<BriefsPage />} />
                <Route path="/settings" element={<SettingsHubPage />} />
                <Route path="/settings/system" element={<AiMonitorPage />} />
                <Route path="/settings/context" element={<ContextsPage />} />
                <Route path="/settings/sources" element={<SourcesPage />} />
                <Route path="/settings/sources/:id" element={<SourceDetailPage />} />
                <Route path="/settings/preferences" element={<ContextPrefsRedirect />} />
                <Route path="/settings/llm" element={<ContextPrefsRedirect />} />
                <Route path="/changes/:id" element={<ChangeDetailPage />} />
                <Route path="/briefs/:date" element={<BriefDetailPage />} />
                {/* Soft redirects — IA contraction keeps deep links alive */}
                <Route path="/explore" element={<Navigate to="/radar" replace />} />
                <Route path="/feed" element={<Navigate to="/radar" replace />} />
                <Route path="/items" element={<Navigate to="/radar" replace />} />
                <Route path="/events" element={<Navigate to="/radar" replace />} />
                <Route path="/changes" element={<Navigate to="/radar?view=changes" replace />} />
                <Route path="/contexts" element={<Navigate to="/settings/context" replace />} />
                <Route path="/sources" element={<Navigate to="/settings/sources" replace />} />
                <Route path="/sources/:id" element={<SourceIdRedirect />} />
                <Route path="/events/:id" element={<EventRedirect />} />
                {/* Unknown URLs used to render a blank main area with no explanation. */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </PullToRefresh>
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
      <BottomTabBar totalUnread={totalUnread} decisionsDue={decisionsDue} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}

function ContextPrefsRedirect() {
  const { hash } = useLocation()
  return <Navigate to={{ pathname: '/settings/context', hash }} replace />
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
