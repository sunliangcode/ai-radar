import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, api, readLocalToken } from '../lib/api'
import { errorText } from '../lib/errors'
import { ListSkeleton, PageHeader, QueryErrorState } from '../components/ui'
import { useEscapeBack } from '../hooks/useEscapeBack'
import { LocalTokenSection } from './settings/LocalTokenSection'
import { SystemHealthCard } from './settings/SystemHealthCard'
import { cn, focusRingClass } from '../lib/cn'

export default function SettingsHubPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.settings })
  const settingsUnauthorized =
    settings.isError &&
    settings.error instanceof ApiError &&
    settings.error.status === 401 &&
    !readLocalToken()

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/')
  }, [navigate])
  useEscapeBack(goBack)

  const sections: { label: string; cards: { to: string; title: string; desc: string; muted?: boolean }[] }[] = [
    {
      label: t('settingsHub.sectionPersonal'),
      cards: [
        {
          to: '/settings/context',
          title: t('settingsHub.context'),
          desc: t('settingsHub.contextDesc'),
        },
        {
          to: '/actions',
          title: t('settingsHub.actions'),
          desc: t('settingsHub.actionsDesc'),
          muted: true,
        },
        {
          to: '/watching',
          title: t('nav.watching'),
          desc: t('watching.subtitle'),
        },
      ],
    },
    {
      label: t('settingsHub.sectionSources'),
      cards: [
        {
          to: '/settings/sources',
          title: t('settingsHub.sources'),
          desc: t('settingsHub.sourcesDesc'),
        },
      ],
    },
    {
      label: t('settingsHub.sectionNotifications'),
      cards: [
        {
          to: '/settings/context#notify',
          title: t('settingsHub.notifications'),
          desc: t('settingsHub.notificationsDesc'),
        },
      ],
    },
    {
      label: t('settingsHub.sectionSystem'),
      cards: [
        {
          to: '/settings/system',
          title: t('settingsHub.systemAdvanced'),
          desc: t('settingsHub.systemDesc'),
          muted: true,
        },
      ],
    },
  ]

  return (
    <div aria-busy={settings.isFetching || undefined}>
      <PageHeader
        titleId="settings-hub-heading"
        title={t('settingsHub.title')}
        subtitle={t('settingsHub.subtitle')}
      />

      {settings.isLoading ? (
        <div className="mb-6">
          <ListSkeleton rows={2} />
        </div>
      ) : null}

      {settings.isError && !settingsUnauthorized ? (
        <div className="mb-6">
          <QueryErrorState
            message={t('common.loadFailed', { message: errorText(settings.error, t) })}
            onRetry={() => void settings.refetch()}
          />
        </div>
      ) : null}

      {settingsUnauthorized ? (
        <div className="mb-6">
          <LocalTokenSection emphasize onSaved={() => void settings.refetch()} />
        </div>
      ) : null}

      <p className="mb-6 text-sm text-muted">{t('settingsHub.lead')}</p>

      <nav className="space-y-8" aria-labelledby="settings-hub-heading">
        {sections.map((section, si) => {
          const headingId = `settings-hub-section-${si}`
          const isSystem = si === sections.length - 1
          return (
            <section key={section.label} aria-labelledby={headingId}>
              <h2
                id={headingId}
                className="mb-3 font-mono text-[10px] uppercase tracking-wider text-faint"
              >
                {section.label}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {section.cards.map((c) => (
                  <Link
                    key={`${section.label}-${c.to}-${c.title}`}
                    to={c.to}
                    aria-label={`${c.title}. ${c.desc}`}
                    className={cn(
                      'group flex min-h-[5.5rem] flex-col rounded-xl border border-border bg-surface p-5 transition hover:border-accent/50 motion-reduce:transition-none',
                      focusRingClass(),
                      c.muted && 'opacity-80',
                      !c.muted && si === 0 && c.to === '/settings/context' && 'border-accent/30 bg-accent-soft/30',
                    )}
                  >
                    <h3 className="text-base font-medium text-ink">{c.title}</h3>
                    <p className="mt-2 text-sm text-muted">{c.desc}</p>
                    <p className="mt-4 text-sm text-accent group-hover:underline motion-reduce:group-hover:no-underline">
                      {t('settingsHub.open')} →
                    </p>
                  </Link>
                ))}
              </div>
              {isSystem ? (
                <div className="mt-4 space-y-4">
                  {!settingsUnauthorized ? (
                    <LocalTokenSection
                      serverConfigured={settings.data?.localTokenConfigured}
                      onSaved={() => void settings.refetch()}
                    />
                  ) : null}
                  <SystemHealthCard />
                </div>
              ) : null}
            </section>
          )
        })}
      </nav>
    </div>
  )
}
