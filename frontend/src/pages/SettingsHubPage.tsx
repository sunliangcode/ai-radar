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
  const health = useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    refetchInterval: 30_000,
    retry: 1,
  })
  // "AI is on" must reflect real call outcomes, not just a config string check: a local Ollama URL
  // counts as configured even when nothing is listening.
  const llmMode = health.data?.llm?.mode
  const aiReady = llmMode === 'ai'
  const aiDegraded = llmMode === 'degraded'

  const cards = [
    {
      to: '/settings/preferences',
      title: t('settingsHub.preferences'),
      desc: t('settingsHub.preferencesDesc'),
    },
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
      to: '/settings/system',
      title: t('settingsHub.system'),
      desc: t('settingsHub.systemDesc'),
    },
  ]

  const bannerCls = aiReady
    ? 'border-moss/40 bg-moss/5'
    : aiDegraded
      ? 'border-ember/40 bg-ember/5'
      : 'border-border bg-surface'
  const bannerText = aiReady
    ? t('settingsHub.aiOn')
    : aiDegraded
      ? t('settingsHub.aiDegraded')
      : t('settingsHub.aiOff')

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

      {/* AI status banner */}
      <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${bannerCls}`}>{bannerText}</div>

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

      <section className="mt-8">
        <h3 className="mb-2 text-base font-semibold text-ink">{t('settingsHub.howItWorks')}</h3>
        <div className="rounded-lg border border-border bg-surface p-4 text-sm leading-relaxed text-muted">
          {t('settingsHub.howItWorksBody')}
        </div>
      </section>

      <p className="mt-6 text-sm text-muted">
        <Link to="/decisions" className="text-moss underline underline-offset-2">
          {t('settingsHub.openDecisions')}
        </Link>
        {' · '}
        <Link to="/briefs" className="text-moss underline underline-offset-2">
          {t('nav.briefs')}
        </Link>
      </p>
    </div>
  )
}
