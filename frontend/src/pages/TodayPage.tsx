import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { api, type ImpactCard } from '../lib/api'
import { Button, ListSkeleton, PageHeader, StateBox } from '../components/ui'
import { FetchProgressSection } from '../components/fetch/FetchProgressSection'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { useSources } from '../hooks/useSources'
import { useImportPack } from '../hooks/useImportPack'

export default function TodayPage() {
  const { t, i18n } = useTranslation()
  const home = useQuery({ queryKey: ['intelligence-home'], queryFn: api.intelligenceHome })
  const sources = useSources()
  const defaultPack = i18n.language.startsWith('zh') ? 'ai-cn' : 'ai-core'
  const [packId, setPackId] = useState(defaultPack)

  const { fetchJob, retryFailed, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['intelligence-home'],
    ['changes-watching'],
    ['feed'],
    ['watching'],
    ['sources'],
  ])

  const importPack = useImportPack({ successMessage: 'home.gettingStarted.imported' })

  const data = home.data
  const sourceCount = sources.data?.length ?? 0
  const todayChanges = (data?.todayChanges ?? data?.whyCare ?? []).slice(0, 10)
  const ready = todayChanges.length > 0

  const highCount = todayChanges.filter((c) => c.tier === 'HIGH').length

  return (
    <div>
      <PageHeader
        title={t('today.title')}
        subtitle={t('today.subtitle')}
        actions={
          <Button onClick={() => fetchJob.mutate()} loading={isPending}>
            {phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
          </Button>
        }
      />

      <FetchProgressSection
        phase={phase}
        progress={progress}
        onDismiss={() => void dismiss()}
        retrying={retryFailed.isPending}
        onRetryFailed={(types) => retryFailed.mutate(types)}
      />

      {home.isLoading ? <ListSkeleton rows={4} /> : null}
      {home.isError ? (
        <StateBox>{t('common.loadFailed', { message: (home.error as Error).message })}</StateBox>
      ) : null}

      {/* Getting started */}
      {!home.isLoading && !home.isError && !ready ? (
        <div className="mb-8 rounded-xl border border-dashed border-border bg-surface p-6">
          <h3 className="text-lg font-medium text-ink">{t('home.gettingStarted.title')}</h3>
          <p className="mt-2 max-w-xl text-sm text-muted">{t('home.gettingStarted.subtitle')}</p>
          {sourceCount === 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <select
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={packId}
                onChange={(e) => setPackId(e.target.value)}
              >
                <option value="ai-core">{t('home.pack.ai-core')}</option>
                <option value="ai-cn">{t('home.pack.ai-cn')}</option>
                <option value="ai-signals">{t('home.pack.ai-signals')}</option>
              </select>
              <Button loading={importPack.isPending} onClick={() => importPack.mutate(packId)}>
                {t('home.gettingStarted.import')}
              </Button>
            </div>
          ) : null}
          <div className="mt-4">
            <Button onClick={() => fetchJob.mutate()} loading={isPending}>
              {t('home.gettingStarted.step2')}
            </Button>
          </div>
        </div>
      ) : null}

      {ready ? (
        <>
          {/* Stats strip */}
          <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
            <span className="text-muted">
              {t('today.statShown')}{' '}
              <strong className="font-mono text-ink">{todayChanges.length}</strong>
            </span>
            <span className="text-muted">
              {t('today.statHigh')}{' '}
              <strong className="font-mono text-ink">{highCount}</strong>
            </span>
            <Link to="/feed" className="ml-auto text-accent hover:underline">
              {t('today.goFeed')} →
            </Link>
          </div>

          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {todayChanges.map((card: ImpactCard) => (
              <TodayRow key={card.id} card={card} />
            ))}
          </ul>

          <p className="mt-4 text-xs text-muted">
            {t('today.hint')}{' '}
            <Link to="/settings" className="text-accent hover:underline">
              {t('today.configureContext')}
            </Link>
            {' · '}
            <Link to="/actions" className="text-accent hover:underline">
              {t('nav.actions')}
            </Link>
          </p>
        </>
      ) : null}
    </div>
  )
}

function TodayRow({ card }: { card: ImpactCard }) {
  return (
    <li className="row-py px-4">
      <div className="flex items-start gap-3">
        <div className="pt-0.5 w-12 shrink-0">
          <div className="font-mono text-sm font-semibold tabular-nums text-ink">
            {card.priority ? Math.min(100, Math.round(card.priority / 1000)) : Math.round(card.relevance ?? 0)}
          </div>
          {card.tier ? (
            <span className="font-mono text-[10px] text-muted">{card.tier}</span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            to={`/changes/${card.eventId}`}
            state={{ from: '/' }}
            className="font-medium text-ink hover:underline"
          >
            {card.title}
          </Link>
          {card.why ? <p className="mt-1 text-sm text-muted">{card.why}</p> : null}
          {card.evidence ? (
            <p className="mt-0.5 text-[11px] text-muted/80">{card.evidence}</p>
          ) : null}
        </div>
      </div>
    </li>
  )
}
