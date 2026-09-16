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

  const cards = [
    {
      to: '/settings/context',
      title: t('settingsHub.context'),
      desc: t('settingsHub.contextDesc'),
    },
    {
      to: '/settings/sources',
      title: t('settingsHub.sources'),
      desc: t('settingsHub.sourcesDesc'),
    },
    {
      to: '/settings/preferences',
      title: t('settingsHub.preferences'),
      desc: t('settingsHub.preferencesDesc'),
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

      <div className="mb-6">
        <SystemHealthCard />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group rounded-xl border border-border bg-surface p-5 transition hover:border-accent/50"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-ink">{c.title}</h3>
            </div>
            <p className="mt-2 text-sm text-muted">{c.desc}</p>
            <p className="mt-4 text-sm text-accent group-hover:underline">→</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
