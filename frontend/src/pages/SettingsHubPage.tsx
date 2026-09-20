import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { errorText } from '../lib/errors'
import { PageHeader, StateBox } from '../components/ui'
import { SystemHealthCard } from './settings/SystemHealthCard'

export default function SettingsHubPage() {
  const { t } = useTranslation()
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.settings })

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
          to: '/settings/preferences',
          title: t('settingsHub.preferences'),
          desc: t('settingsHub.preferencesDesc'),
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
          to: '/settings/preferences',
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
    <div>
      <PageHeader title={t('settingsHub.title')} subtitle={t('settingsHub.subtitle')} />

      {settings.isError ? (
        <div className="mb-6">
          <StateBox>
            <p className="mb-3">{t('common.loadFailed', { message: errorText(settings.error, t) })}</p>
          </StateBox>
        </div>
      ) : null}

      <div className="mb-8">
        <SystemHealthCard />
      </div>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.label}>
            <h2 className="mb-3 font-mono text-[10px] uppercase tracking-wider text-faint">
              {section.label}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              {section.cards.map((c) => (
                <Link
                  key={`${section.label}-${c.to}-${c.title}`}
                  to={c.to}
                  className={`group rounded-xl border border-border bg-surface p-5 transition hover:border-accent/50 ${
                    c.muted ? 'opacity-80' : ''
                  }`}
                >
                  <h3 className="text-base font-medium text-ink">{c.title}</h3>
                  <p className="mt-2 text-sm text-muted">{c.desc}</p>
                  <p className="mt-4 text-sm text-accent group-hover:underline">→</p>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
