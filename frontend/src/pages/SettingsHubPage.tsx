import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { PageHeader } from '../components/ui'

export default function SettingsHubPage() {
  const { t } = useTranslation()
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.settings })
  const s = settings.data
  const aiReady = s?.openaiConfigured

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
      to: '/settings/llm',
      title: t('settingsHub.llm'),
      desc: aiReady ? t('settingsHub.llmReady') : t('settingsHub.llmNotReady'),
      badge: aiReady ? t('settingsHub.on') : t('settingsHub.off'),
      badgeCls: aiReady ? 'text-moss border-moss/40' : 'text-ember border-ember/40',
    },
  ]

  return (
    <div>
      <PageHeader title={t('settingsHub.title')} subtitle={t('settingsHub.subtitle')} />

      {/* AI status banner */}
      <div
        className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
          aiReady ? 'border-moss/40 bg-moss/5' : 'border-ember/40 bg-ember/5'
        }`}
      >
        {aiReady ? t('settingsHub.aiOn') : t('settingsHub.aiOff')}
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
              {c.badge ? (
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-mono ${c.badgeCls}`}>{c.badge}</span>
              ) : null}
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
    </div>
  )
}
