import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  MessageSquare,
  MoreHorizontal,
  Newspaper,
  Radar,
} from 'lucide-react'
import { formatUnreadBadge } from '../../lib/format'
import { cn } from '../../lib/cn'

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-1 focus-visible:ring-offset-bg'

const TABS = [
  { to: '/', labelKey: 'nav.today', icon: Newspaper, end: true },
  { to: '/radar', labelKey: 'nav.radar', icon: Radar, end: false, badge: true },
  { to: '/decisions', labelKey: 'nav.decisions', icon: ArrowRight, end: false },
  { to: '/chat', labelKey: 'nav.chat', icon: MessageSquare, end: false },
  { to: '/settings', labelKey: 'nav.more', icon: MoreHorizontal, end: false },
] as const

export function BottomTabBar({ totalUnread }: { totalUnread: number }) {
  const { t } = useTranslation()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label={t('nav.main')}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  cn(
                    'relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[10px] transition-colors motion-reduce:transition-none',
                    focusRing,
                    isActive ? 'text-accent font-medium' : 'text-muted',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'absolute top-0 h-0.5 w-5 rounded-full bg-accent transition-opacity motion-reduce:transition-none',
                        isActive ? 'opacity-100' : 'opacity-0',
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        'relative rounded-lg px-2.5 py-0.5 transition-transform motion-reduce:transition-none',
                        isActive && 'scale-105',
                      )}
                    >
                      <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} aria-hidden />
                      {'badge' in tab && tab.badge && totalUnread > 0 ? (
                        <span
                          className="absolute -right-1.5 -top-0.5 min-w-[1rem] rounded-full bg-moss px-1 text-center font-mono text-[9px] leading-4 text-white"
                          aria-label={t('feed.unreadInline', { count: totalUnread })}
                        >
                          {formatUnreadBadge(totalUnread)}
                        </span>
                      ) : null}
                    </span>
                    <span>{t(tab.labelKey)}</span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
