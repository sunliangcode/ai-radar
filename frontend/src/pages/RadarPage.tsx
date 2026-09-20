import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '../components/ui'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { FetchProgressSection } from '../components/fetch/FetchProgressSection'
import {
  RadarChangesPanel,
  RadarModeBar,
  RadarPageHeader,
  RadarSearch,
  useRadarMode,
} from './radar/RadarChrome'
import FeedSignalsPage from './FeedPage'

/**
 * Radar = daily browse + intelligence search.
 * Default view is Signals (waterfall feed); Changes via tab / ?view=changes.
 */
export default function RadarPage() {
  const { t } = useTranslation()
  const { view, filter, setView, setFilter } = useRadarMode()
  const [changeQ, setChangeQ] = useState('')
  const { fetchJob, retryFailed, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['changes-list'],
    ['watching'],
    ['feed'],
    ['sources'],
    ['intelligence-home'],
  ])

  if (view === 'signals') {
    return (
      <div aria-busy={isPending || undefined}>
        <h1 className="sr-only">{t('radar.title')}</h1>
        <RadarModeBar view={view} filter={filter} onView={setView} onFilter={setFilter} />
        <FeedSignalsPage forceUnread={filter === 'unread'} hideTitle />
      </div>
    )
  }

  return (
    <div aria-busy={isPending || undefined}>
      <RadarPageHeader />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label={t('radar.title')}>
        <Button onClick={() => fetchJob.mutate(undefined)} loading={isPending} disabled={isPending}>
          {phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
        </Button>
        <Link to="/settings/sources" className={buttonVariants({ variant: 'ghost' })}>
          {t('nav.sources')}
        </Link>
      </div>
      <FetchProgressSection
        phase={phase}
        progress={progress}
        onDismiss={() => void dismiss()}
        retrying={retryFailed.isPending}
        onRetryFailed={(types) => retryFailed.mutate(types)}
      />
      <RadarModeBar view={view} filter={filter} onView={setView} onFilter={setFilter} />
      <RadarSearch
        value={changeQ}
        onChange={setChangeQ}
        placeholder={t('radar.searchPlaceholder')}
      />
      <RadarChangesPanel
        followingOnly={filter === 'following'}
        searchQ={changeQ}
        onClearSearch={() => setChangeQ('')}
      />
    </div>
  )
}
