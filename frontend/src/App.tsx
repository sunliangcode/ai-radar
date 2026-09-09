import { NavLink, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ActionsPage from './pages/ActionsPage'
import BriefDetailPage from './pages/BriefDetailPage'
import ChangeDetailPage from './pages/ChangeDetailPage'
import ChangesPage from './pages/ChangesPage'
import ContextsPage from './pages/ContextsPage'
import HomePage from './pages/HomePage'
import ItemsPage from './pages/ItemsPage'
import SourceDetailPage from './pages/SourceDetailPage'

function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = i18n.language.startsWith('zh') ? 'zh' : 'en'

  return (
    <div className="mb-6 flex gap-1">
      {(['zh', 'en'] as const).map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => void i18n.changeLanguage(lng)}
          className={`rounded-sm px-2.5 py-1 text-xs font-medium tracking-wide transition duration-150 ${
            current === lng
              ? 'bg-ink text-paper'
              : 'text-muted hover:bg-mist hover:text-ink'
          }`}
        >
          {lng === 'zh' ? t('nav.langZh') : t('nav.langEn')}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const { t } = useTranslation()
  const nav = [
    { to: '/', label: t('nav.today'), end: true },
    { to: '/changes', label: t('nav.changes'), end: false },
    { to: '/contexts', label: t('nav.contexts'), end: false },
    { to: '/actions', label: t('nav.actions'), end: false },
    { to: '/items', label: t('nav.items'), end: false },
  ]

  return (
    <div className="min-h-dvh bg-white md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-mist bg-white px-5 py-6 md:border-b-0 md:border-r md:min-h-dvh">
        <div className="mb-4 border-b border-mist pb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted">{t('nav.product')}</p>
          <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-ink">{t('nav.brand')}</h1>
          <p className="mt-2 text-xs leading-relaxed text-muted">{t('nav.tagline')}</p>
        </div>
        <LanguageSwitcher />
        <nav className="flex gap-2 overflow-x-auto md:flex-col md:gap-0.5" aria-label={t('nav.main')}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-sm px-3 py-2 text-sm tracking-wide transition duration-150 ${
                  isActive
                    ? 'bg-ink text-paper'
                    : 'text-muted hover:bg-mist hover:text-ink'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="bg-white px-5 py-6 md:px-10 md:py-8">
        <div className="mx-auto max-w-6xl">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/changes" element={<ChangesPage />} />
            <Route path="/changes/:id" element={<ChangeDetailPage />} />
            <Route path="/actions" element={<ActionsPage />} />
            <Route path="/contexts" element={<ContextsPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/briefs/:date" element={<BriefDetailPage />} />
            <Route path="/sources/:id" element={<SourceDetailPage />} />
            <Route path="/events" element={<Navigate to="/changes" replace />} />
            <Route path="/events/:id" element={<EventRedirect />} />
            <Route path="/briefs" element={<Navigate to="/" replace />} />
            <Route path="/sources" element={<Navigate to="/contexts" replace />} />
            <Route path="/settings" element={<Navigate to="/contexts" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

function EventRedirect() {
  const { id } = useParams()
  return <Navigate to={`/changes/${id ?? ''}`} replace />
}
