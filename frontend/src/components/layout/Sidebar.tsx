import { Link, NavLink, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  MessageSquare,
  Newspaper,
  Radar,
  Search,
  Settings,
} from 'lucide-react'
import { useEngagement } from '../../hooks/useEngagement'
import { LanguageSwitcher, ThemeDensityControls } from './PrefsControls'
import { cn } from '../../lib/cn'

const NAV_ICONS = {
  '/': Newspaper,
  '/radar': Radar,
  '/decisions': ArrowRight,
  '/chat': MessageSquare,
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
  const { streak, todayReadCount } = useEngagement()
  const [searchParams] = useSearchParams()
  const activeSourceType = searchParams.get('sourceType') ?? ''

  const primaryNav = [
    { to: '/', label: t('nav.today'), end: true },
    { to: '/radar', label: t('nav.radar'), end: false },
    { to: '/decisions', label: t('nav.decisions'), end: false },
  ]
  const secondaryNav = [
    { to: '/chat', label: t('nav.chat'), end: false },
    { to: '/settings', label: t('nav.settings'), end: false },
  ]

  return (
    <aside className="border-b border-border md:bg-sidebar px-5 py-5 md:border-b-0 md:border-r md:min-h-dvh flex md:flex-col gap-4 md:gap-0">
      <div className="md:mb-4 md:border-b md:border-border md:pb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">{t('nav.product')}</p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight">{t('nav.brand')}</h1>
        <p className="mt-1 text-[11px] text-faint">{t('nav.taglineV2')}</p>
        {(streak > 0 || todayReadCount > 0) ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {streak > 0 ? (
              <span className="rounded-md bg-border/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted">
                {t('fun.streakPill', { count: streak })}
              </span>
            ) : null}
            {todayReadCount > 0 ? (
              <span className="rounded-md bg-border/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted">
                {t('fun.readPill', { count: todayReadCount })}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <nav className="flex md:flex-col gap-1 overflow-x-auto" aria-label={t('nav.main')}>
        {primaryNav.map((item) => {
          const Icon = NAV_ICONS[item.to as keyof typeof NAV_ICONS]
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition',
                  isActive ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:bg-border hover:text-ink',
                )
              }
            >
              {Icon ? <Icon size={14} className="shrink-0 opacity-70" aria-hidden /> : null}
              <span className="flex-1 whitespace-nowrap">{item.label}</span>
              {item.to === '/radar' && totalUnread > 0 ? (
                <span className="rounded-full bg-moss/15 px-1.5 py-px font-mono text-[10px] text-moss">
                  {totalUnread}
                </span>
              ) : null}
            </NavLink>
          )
        })}
        <div className="my-1.5 hidden border-t border-border md:block" aria-hidden />
        {secondaryNav.map((item) => {
          const Icon = NAV_ICONS[item.to as keyof typeof NAV_ICONS]
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition',
                  isActive
                    ? 'bg-accent-soft text-accent font-medium'
                    : 'text-faint hover:bg-border hover:text-muted',
                )
              }
            >
              {Icon ? <Icon size={14} className="shrink-0 opacity-50" aria-hidden /> : null}
              <span className="flex-1 whitespace-nowrap">{item.label}</span>
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
              const active = activeSourceType === type
              return (
                <Link
                  key={type}
                  to={`/radar?view=signals&sourceType=${encodeURIComponent(type)}`}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded px-2.5 py-1 text-xs transition ${
                    active
                      ? 'bg-accent-soft font-medium text-accent'
                      : count > 0
                        ? 'font-medium text-ink hover:bg-border'
                        : 'text-faint hover:bg-border'
                  }`}
                >
                  <span className="flex-1 truncate">{type}</span>
                  {count > 0 ? (
                    <span className="font-mono text-[10px] text-moss">{count}</span>
                  ) : null}
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}

      <div className="mt-auto hidden pt-6 md:flex md:flex-col md:gap-2">
        <LanguageSwitcher />
        <ThemeDensityControls />
      </div>
    </aside>
  )
}
