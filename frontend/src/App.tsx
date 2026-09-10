import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import ActionsPage from './pages/ActionsPage'
import BriefDetailPage from './pages/BriefDetailPage'
import ChangeDetailPage from './pages/ChangeDetailPage'
import ContextsPage from './pages/ContextsPage'
import FeedPage from './pages/FeedPage'
import SettingsPage from './pages/SettingsPage'
import SettingsHubPage from './pages/SettingsHubPage'
import SourceDetailPage from './pages/SourceDetailPage'
import SourcesPage from './pages/SourcesPage'
import TodayPage from './pages/TodayPage'
import WatchingPage from './pages/WatchingPage'
import AiMonitorPage from './pages/AiMonitorPage'
import { PrefsProvider, ToastProvider } from './components/ui'
import { Sidebar } from './components/layout/Sidebar'
import { CommandPalette } from './components/CommandPalette'
import { useSources } from './hooks/useSources'
import { useUnreadCounts } from './hooks/useUnreadCounts'

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
        <div className="mx-auto max-w-4xl">
          <Routes>
            <Route path="/monitor" element={<AiMonitorPage />} />
            <Route path="/" element={<TodayPage />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/watching" element={<WatchingPage />} />
            <Route path="/settings" element={<SettingsHubPage />} />
            <Route path="/settings/context" element={<ContextsPage />} />
            <Route path="/settings/sources" element={<SourcesPage />} />
            <Route path="/settings/sources/:id" element={<SourceDetailPage />} />
            <Route path="/settings/llm" element={<SettingsPage />} />
            <Route path="/changes/:id" element={<ChangeDetailPage />} />
            <Route path="/actions" element={<ActionsPage />} />
            <Route path="/briefs/:date" element={<BriefDetailPage />} />
            {/* Legacy redirects */}
            <Route path="/changes" element={<Navigate to="/feed" replace />} />
            <Route path="/items" element={<Navigate to="/feed" replace />} />
            <Route path="/contexts" element={<Navigate to="/settings/context" replace />} />
            <Route path="/sources" element={<Navigate to="/settings/sources" replace />} />
            <Route path="/sources/:id" element={<SourceIdRedirect />} />
            <Route path="/events" element={<Navigate to="/feed" replace />} />
            <Route path="/events/:id" element={<EventRedirect />} />
            <Route path="/briefs" element={<Navigate to="/" replace />} />
          </Routes>
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
