import { Link, NavLink, useLocation, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  MessageSquare,
  Newspaper,
  Radar,
  Rss,
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
  '/settings/sources': Rss,
  '/settings': Settings,
} as const

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar'

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
  const location = useLocation()
  const activeSourceType = searchParams.get('sourceType') ?? ''

  const primaryNav = [
    { to: '/', label: t('nav.today'), end: true },
    { to: '/radar', label: t('nav.radar'), end: false },
    { to: '/decisions', label: t('nav.decisions'), end: false },
  ]
  const secondaryNav = [
    { to: '/chat', label: t('nav.chat'), end: false },
    { to: '/settings/sources', label: t('nav.sources'), end: false },
    { to: '/settings', label: t('nav.settings'), end: false },
  ]

  return (
    <aside className="flex flex-col gap-3 border-b border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:min-h-dvh md:gap-0 md:border-b-0 md:border-r md:bg-sidebar md:px-5 md:py-5 md:pb-5">
      <div className="flex items-center justify-between gap-3 md:mb-4 md:block md:border-b md:border-border md:pb-4">
        <div className="min-w-0">
          <Link
            to="/"
            className={cn('block rounded-sm', focusRing)}
            aria-label={t('nav.brand')}
          >
            <p className="hidden font-mono text-[10px] uppercase tracking-[0.25em] text-muted md:block">
              {t('nav.product')}
            </p>
            <span className="text-base font-semibold tracking-tight md:mt-1 md:block md:text-lg">
              {t('nav.brand')}
            </span>
          </Link>
          <p className="mt-1 hidden text-[11px] text-faint md:block">{t('nav.taglineV2')}</p>
          {(streak > 0 || todayReadCount > 0) ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5 md:mt-2.5" aria-label={t('fun.engagementLabel')}>
              {streak > 0 ? (
                <span className="rounded-md bg-border/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted">
                  {t('fun.streakPill', { count: streak })}
                </span>
              ) : null}
              {todayReadCount > 0 ? (
                <span className="hidden rounded-md bg-border/70 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted sm:inline">
                  {t('fun.readPill', { count: todayReadCount })}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 md:hidden">
          <LanguageSwitcher />
          <ThemeDensityControls />
        </div>
      </div>
      <nav
        className="-mx-1 flex gap-1 overflow-x-auto scroll-smooth snap-x snap-mandatory px-1 md:mx-0 md:flex-col md:overflow-visible md:snap-none md:px-0"
        aria-label={t('nav.main')}
      >
        {primaryNav.map((item) => {
          const Icon = NAV_ICONS[item.to as keyof typeof NAV_ICONS]
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'snap-start flex min-h-9 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition motion-reduce:transition-none',
                  focusRing,
                  isActive ? 'bg-accent-soft text-accent font-medium' : 'text-muted hover:bg-border hover:text-ink',
                )
              }
            >
              {Icon ? <Icon size={14} className="shrink-0 opacity-70" aria-hidden /> : null}
              <span className="flex-1 whitespace-nowrap">{item.label}</span>
              {item.to === '/radar' && totalUnread > 0 ? (
                <span
                  className="rounded-full bg-moss/15 px-1.5 py-px font-mono text-[10px] text-moss"
                  aria-label={t('feed.unreadInline', { count: totalUnread })}
                >
                  {totalUnread}
                </span>
              ) : null}
            </NavLink>
          )
        })}
        <div className="my-1.5 hidden border-t border-border md:block" aria-hidden />
        {secondaryNav.map((item) => {
          const Icon = NAV_ICONS[item.to as keyof typeof NAV_ICONS]
          const pathActive =
            item.to === '/settings'
              ? location.pathname.startsWith('/settings') &&
                !location.pathname.startsWith('/settings/sources')
              : item.to === '/settings/sources'
                ? location.pathname.startsWith('/settings/sources')
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={pathActive ? 'page' : undefined}
              className={cn(
                'snap-start flex min-h-9 items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition motion-reduce:transition-none',
                focusRing,
                pathActive
                  ? 'bg-accent-soft text-accent font-medium'
                  : 'text-faint hover:bg-border hover:text-muted',
              )}
            >
              {Icon ? <Icon size={14} className="shrink-0 opacity-50" aria-hidden /> : null}
              <span className="flex-1 whitespace-nowrap">{item.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={onOpenPalette}
          aria-keyshortcuts="Meta+K Control+K"
          aria-label={t('nav.search')}
          className={cn(
            'snap-start mt-0.5 flex min-h-9 items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm text-muted transition motion-reduce:transition-none hover:bg-border hover:text-ink',
            focusRing,
          )}
        >
          <Search size={14} className="shrink-0 opacity-70" aria-hidden />
          <span className="flex-1">{t('nav.search')}</span>
          <kbd className="hidden md:inline" aria-hidden>
            ⌘K
          </kbd>
        </button>
      </nav>

      {sourceTypes.length > 0 ? (
        <>
          <div
            className="mt-2 flex gap-1.5 overflow-x-auto pb-1 md:hidden"
            aria-label={t('nav.sourceTypes')}
          >
            {sourceTypes.slice(0, 8).map(([type]) => {
              const count = unreadByType[type] ?? 0
              const active = activeSourceType === type
              return (
                <Link
                  key={`m-${type}`}
                  to={`/radar?view=signals&sourceType=${encodeURIComponent(type)}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'snap-start flex min-h-9 shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] transition motion-reduce:transition-none',
                    focusRing,
                    active
                      ? 'border-accent bg-accent-soft font-medium text-accent'
                      : 'border-border text-muted hover:border-accent/40 hover:text-ink',
                  )}
                >
                  {type}
                  {count > 0 ? (
                    <span className="ml-1 font-mono text-[10px] text-moss">{count}</span>
                  ) : null}
                </Link>
              )
            })}
          </div>
          <div className="mt-4 hidden md:block">
            <p className="mb-1 px-2.5 text-[10px] font-mono uppercase tracking-wider text-muted/70">
              {t('nav.sourceTypes')}
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
                    className={cn(
                      'flex min-h-9 items-center gap-2 rounded px-2.5 py-1 text-xs transition motion-reduce:transition-none',
                      focusRing,
                      active
                        ? 'bg-accent-soft font-medium text-accent'
                        : count > 0
                          ? 'font-medium text-ink hover:bg-border'
                          : 'text-faint hover:bg-border',
                    )}
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
        </>
      ) : null}

      <div className="mt-3 hidden flex-wrap items-center gap-2 md:mt-auto md:flex md:flex-col md:items-start md:gap-2 md:pt-6">
        <LanguageSwitcher />
        <ThemeDensityControls />
      </div>
    </aside>
  )
}
