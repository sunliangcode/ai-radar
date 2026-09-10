import { Link, NavLink, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { api } from './lib/api'
import { PrefsProvider, usePrefs } from './components/ui'
import { CommandPalette } from './components/CommandPalette'

function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const current = i18n.language.startsWith('zh') ? 'zh' : 'en'
  return (
    <div className="flex gap-0.5">
      {(['zh', 'en'] as const).map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => void i18n.changeLanguage(lng)}
          className={`rounded px-1.5 py-0.5 text-[11px] font-mono ${
            current === lng ? 'bg-ink text-paper' : 'text-muted hover:text-ink'
          }`}
        >
          {lng === 'zh' ? '中' : 'EN'}
        </button>
      ))}
    </div>
  )
}

function ThemeDensityControls() {
  const { t } = useTranslation()
  const { theme, setTheme, density, setDensity } = usePrefs()
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="h-7 w-7 rounded text-xs text-muted hover:bg-mist/60 hover:text-ink"
        title={t('app.theme')}
      >
        {theme === 'dark' ? '☀' : '☾'}
      </button>
      <div className="flex rounded border border-border p-0.5">
        {(['comfortable', 'compact', 'cozy'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDensity(d)}
            className={`h-5 w-5 rounded text-[10px] font-mono ${density === d ? 'bg-ink text-paper' : 'text-muted'}`}
            title={t(`app.density.${d}`)}
          >
            {d === 'comfortable' ? 'M' : d === 'compact' ? 'S' : 'L'}
          </button>
        ))}
      </div>
    </div>
  )
}

function Shell() {
  const { t } = useTranslation()
  const [paletteOpen, setPaletteOpen] = useState(false)

  const unread = useQuery({ queryKey: ['unread-counts'], queryFn: api.unreadCounts, refetchInterval: 60_000 })
  const sources = useQuery({ queryKey: ['sources'], queryFn: api.sources })

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

  const nav = [
    { to: '/', label: t('nav.today'), end: true, icon: '◉' },
    { to: '/feed', label: t('nav.feed'), end: false, icon: '≡' },
    { to: '/watching', label: t('nav.watching'), end: false, icon: '★' },
    { to: '/settings', label: t('nav.settings'), end: false, icon: '⚙' },
  ]

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[230px_1fr] bg-bg text-ink">
      <aside className="border-b border-border md:bg-sidebar px-5 py-5 md:border-b-0 md:border-r md:min-h-dvh flex md:flex-col gap-4 md:gap-0">
        <div className="md:mb-4 md:border-b md:border-border md:pb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">{t('nav.product')}</p>
          <h1 className="mt-1 text-lg font-semibold tracking-tight">{t('nav.brand')}</h1>
        </div>
        <nav className="flex md:flex-col gap-1 overflow-x-auto" aria-label={t('nav.main')}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition ${
                  isActive ? 'bg-ink text-paper' : 'text-muted hover:bg-mist/60 hover:text-ink'
                }`
              }
            >
              <span className="font-mono text-xs opacity-70">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.to === '/feed' && totalUnread > 0 ? (
                <span className="rounded-full bg-moss/15 px-1.5 py-px font-mono text-[10px] text-moss">
                  {totalUnread}
                </span>
              ) : null}
            </NavLink>
          ))}
          <button
            onClick={() => setPaletteOpen(true)}
            className="mt-0 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted hover:bg-mist/60 hover:text-ink text-left"
          >
            <span className="font-mono text-xs opacity-70">⌘K</span>
            <span>{t('nav.search')}</span>
          </button>
        </nav>

        {sourceTypes.length > 0 ? (
          <div className="mt-4 hidden md:block">
            <p className="mb-1 px-2.5 text-[10px] font-mono uppercase tracking-wider text-muted/70">
              {t('nav.sources')}
            </p>
            <div className="flex flex-col gap-0.5">
              {sourceTypes.slice(0, 10).map(([type]) => {
                const count = unread.data?.[type] ?? 0
                return (
                  <Link
                    key={type}
                    to={`/feed?sourceType=${encodeURIComponent(type)}`}
                    className={`flex items-center gap-2 rounded px-2.5 py-1 text-xs text-muted hover:bg-mist/60 hover:text-ink ${count > 0 ? 'font-medium text-ink' : ''}`}
                  >
                    <span className="flex-1 font-mono">{type}</span>
                    {count > 0 ? (
                      <span className="font-mono text-[10px] text-moss">{count}</span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </div>
        ) : null}
        <div className="ml-auto md:ml-0 md:mt-auto flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeDensityControls />
        </div>
      </aside>
      <main className="px-4 py-5 md:px-8 md:py-7">
        <div className="mx-auto max-w-4xl">
          <Routes>
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

export default function App() {
  return (
    <PrefsProvider>
      <Shell />
    </PrefsProvider>
  )
}
