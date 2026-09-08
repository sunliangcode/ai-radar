import { NavLink, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BriefDetailPage from './pages/BriefDetailPage'
import BriefsPage from './pages/BriefsPage'
import EventDetailPage from './pages/EventDetailPage'
import EventsPage from './pages/EventsPage'
import HomePage from './pages/HomePage'
import ItemsPage from './pages/ItemsPage'
import SettingsPage from './pages/SettingsPage'
import SourceDetailPage from './pages/SourceDetailPage'
import SourcesPage from './pages/SourcesPage'

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
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
            current === lng
              ? 'bg-moss text-paper'
              : 'text-muted hover:bg-mist/70 hover:text-ink'
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
    { to: '/events', label: t('nav.events'), end: false },
    { to: '/sources', label: t('nav.sources'), end: false },
    { to: '/items', label: t('nav.items'), end: false },
    { to: '/briefs', label: t('nav.briefs'), end: false },
    { to: '/settings', label: t('nav.settings'), end: false },
  ]

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b border-mist bg-paper/80 px-5 py-6 backdrop-blur md:border-b-0 md:border-r md:min-h-screen">
        <div className="mb-4">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-moss">{t('nav.product')}</p>
          <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-ink">{t('nav.brand')}</h1>
        </div>
        <LanguageSwitcher />
        <nav className="flex gap-2 overflow-x-auto md:flex-col md:gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm transition ${
                  isActive
                    ? 'bg-moss text-paper'
                    : 'text-muted hover:bg-mist/70 hover:text-ink'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="px-5 py-6 md:px-10 md:py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/events" element={<EventsPage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route path="/sources" element={<SourcesPage />} />
          <Route path="/sources/:id" element={<SourceDetailPage />} />
          <Route path="/items" element={<ItemsPage />} />
          <Route path="/briefs" element={<BriefsPage />} />
          <Route path="/briefs/:date" element={<BriefDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  )
}
