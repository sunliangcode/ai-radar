import { Link, NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Activity, ArrowRight, List, Newspaper, Search, Settings, Star } from 'lucide-react'
import { LanguageSwitcher, ThemeDensityControls } from './PrefsControls'

const NAV_ICONS = {
  '/monitor': Activity,
  '/': Newspaper,
  '/feed': List,
  '/watching': Star,
  '/actions': ArrowRight,
  '/settings': Settings,
} as const

export function Sidebar({
  totalUnread,
  unreadByType,
  sourceTypes,
  onOpenPalette,
}: {
  totalUnread: number
  unreadByType: Record<string, number>
  sourceTypes: [string, number][]
  onOpenPalette: () => void
}) {
  const { t } = useTranslation()

  const nav = [
    { to: '/monitor', label: t('nav.monitor'), end: false },
    { to: '/', label: t('nav.today'), end: true },
    { to: '/feed', label: t('nav.feed'), end: false },
    { to: '/watching', label: t('nav.watching'), end: false },
    { to: '/actions', label: t('nav.actions'), end: false },
    { to: '/settings', label: t('nav.settings'), end: false },
  ]

  return (
    <aside className="border-b border-border md:bg-sidebar px-5 py-5 md:border-b-0 md:border-r md:min-h-dvh flex md:flex-col gap-4 md:gap-0">
      <div className="md:mb-4 md:border-b md:border-border md:pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">{t('nav.product')}</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight">{t('nav.brand')}</h1>
      </div>
      <nav className="flex md:flex-col gap-1 overflow-x-auto" aria-label={t('nav.main')}>
        {nav.map((item) => {
          const Icon = NAV_ICONS[item.to as keyof typeof NAV_ICONS]
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition ${
                  isActive ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:bg-border hover:text-ink'
                }`
              }
            >
              {Icon ? <Icon size={14} className="shrink-0 opacity-70" aria-hidden /> : null}
              <span className="flex-1 whitespace-nowrap">{item.label}</span>
              {item.to === '/feed' && totalUnread > 0 ? (
                <span className="rounded-full bg-moss/15 px-1.5 py-px font-mono text-[10px] text-moss">
                  {totalUnread}
                </span>
              ) : null}
            </NavLink>
          )
        })}
        <button
          onClick={onOpenPalette}
          className="mt-0.5 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted hover:bg-border hover:text-ink text-left"
        >
          <Search size={14} className="shrink-0 opacity-70" aria-hidden />
          <span className="flex-1">{t('nav.search')}</span>
          <kbd className="hidden md:inline">⌘K</kbd>
        </button>
      </nav>

      {sourceTypes.length > 0 ? (
        <div className="mt-4 hidden md:block">
          <p className="mb-1 px-2.5 text-[10px] font-mono uppercase tracking-wider text-muted/70">
            {t('nav.sources')}
          </p>
          <div className="flex flex-col gap-0.5">
            {sourceTypes.slice(0, 10).map(([type]) => {
              const count = unreadByType[type] ?? 0
              return (
                <Link
                  key={type}
                  to={`/feed?sourceType=${encodeURIComponent(type)}`}
                  className={`flex items-center gap-2 rounded px-2.5 py-1 text-xs hover:bg-border ${count > 0 ? 'font-medium text-ink' : 'text-faint'}`}
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
  )
}
