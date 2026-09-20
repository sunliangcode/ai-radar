import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ImpactCard } from '../lib/api'
import {
  Button,
  EmptyState,
  ListSkeleton,
  PageHeader,
  QueryErrorState,
  useToast,
} from '../components/ui'
import { ChangeAttentionList } from '../components/today/ChangeAttentionList'
import { PackPicker } from '../components/PackPicker'
import { FetchProgressSection } from '../components/fetch/FetchProgressSection'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { useEngagement } from '../hooks/useEngagement'
import { useSources } from '../hooks/useSources'
import { useDisplaySources } from '../hooks/useDisplaySources'
import { useChangeSourceMap } from '../hooks/useChangeSourceMap'
import { useUnreadCounts } from '../hooks/useUnreadCounts'
import { impactEventMatchesDisplay } from '../lib/sourceFilter'
import { errorText } from '../lib/errors'
import { dateLocale } from '../i18n'
import { cn, focusRingClass, textLinkClass } from '../lib/cn'

function greetingKey(hour: number) {
  if (hour < 12) return 'today.goodMorning'
  if (hour < 18) return 'today.goodAfternoon'
  return 'today.goodEvening'
}

function todayIsoDate(timeZone?: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

export default function TodayPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const engagement = useEngagement()
  const home = useQuery({ queryKey: ['intelligence-home'], queryFn: api.intelligenceHome })
  const sources = useSources()
  const unread = useUnreadCounts()
  const { displaySourceIds } = useDisplaySources()
  const changeSourceMap = useChangeSourceMap()

  const { fetchJob, retryFailed, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['intelligence-home'],
    ['changes-watching'],
    ['feed'],
    ['watching'],
    ['sources'],
    ['decisions'],
  ])

  const impactJob = useMutation({
    mutationFn: api.impactJob,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      pushToast('success', t(engagement.fetchDoneToastKey()))
    },
    onError: (err) => pushToast('error', errorText(err, t)),
  })

  const dismissMut = useMutation({
    mutationFn: (changeId: number) => api.dismissChange(changeId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      pushToast('success', t('today.dismissed'))
    },
    onError: (err) => pushToast('error', errorText(err, t)),
  })

  const followMut = useMutation({
    mutationFn: (changeId: number) => api.putWatch(changeId, { capability: true, api: true }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      await qc.invalidateQueries({ queryKey: ['watching'] })
      pushToast('success', t('today.followed'))
    },
    onError: (err) => pushToast('error', errorText(err, t)),
  })

  const data = home.data
  const sourceCount = sources.data?.length ?? 0
  const hasSources = sourceCount > 0
  const feedUnread = Object.values(unread.data ?? {}).reduce((sum, n) => sum + n, 0)
  const hasFeed = feedUnread > 0
  const filterCard = (card: ImpactCard) =>
    impactEventMatchesDisplay(card.eventId, changeSourceMap, displaySourceIds)

  const major = (data?.majorChanges ?? data?.todayChanges ?? []).filter(filterCard).slice(0, 5)
  const minor = (data?.minorSignals ?? []).filter(filterCard).slice(0, 8)
  const following = major.filter((c) => c.watched)
  const revisit = (data?.decisionsToRevisit ?? [])
    .filter((d) => impactEventMatchesDisplay(d.changeId, changeSourceMap, displaySourceIds))
    .slice(0, 1)
  const alerts = (data?.proactiveAlerts ?? []).filter((a) =>
    impactEventMatchesDisplay(a.changeId, changeSourceMap, displaySourceIds),
  )
  const majorCount = major.length
  const ready = major.length > 0 || minor.length > 0
  const busyEventId =
    (dismissMut.isPending ? dismissMut.variables : null) ??
    (followMut.isPending ? followMut.variables : null) ??
    null
  const locale = dateLocale(i18n.language)
  const dateLabel = new Date().toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const briefDate = todayIsoDate()
  const hour = new Date().getHours()

  const runFetch = () => {
    fetchJob.mutate(undefined, {
      onSuccess: () => impactJob.mutate(),
    })
  }

  return (
    <div aria-busy={isPending || impactJob.isPending || undefined}>
      <PageHeader
        title={t(greetingKey(hour))}
        subtitle={dateLabel}
        actions={
          <Button onClick={runFetch} loading={isPending} disabled={isPending}>
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
        <QueryErrorState
          message={t('common.loadFailed', { message: errorText(home.error, t) })}
          onRetry={() => void home.refetch()}
        />
      ) : null}

      {!home.isLoading && !home.isError && !ready ? (
        <EmptyState
          title={
            !hasSources
              ? t('home.gettingStarted.title')
              : hasFeed
                ? t('home.gettingStarted.hasFeedTitle')
                : t('home.gettingStarted.hasSourcesTitle')
          }
          description={
            !hasSources
              ? t('home.gettingStarted.subtitle')
              : hasFeed
                ? t('home.gettingStarted.hasFeedSubtitle', { count: feedUnread })
                : t('home.gettingStarted.hasSourcesSubtitle')
          }
          primary={
            <>
              {!hasSources ? (
                <PackPicker
                  buttonLabel={t('home.gettingStarted.import')}
                  successMessage="home.gettingStarted.imported"
                />
              ) : null}
              {hasFeed ? (
                <>
                  <Link
                    to="/radar"
                    className={cn(
                      'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink transition motion-reduce:transition-none hover:border-accent/40',
                      focusRingClass(),
                    )}
                  >
                    {t('home.gettingStarted.browseRadar')}
                  </Link>
                  <Button
                    onClick={() => impactJob.mutate()}
                    loading={impactJob.isPending}
                    disabled={impactJob.isPending || isPending}
                  >
                    {t('home.gettingStarted.recomputeImpact')}
                  </Button>
                </>
              ) : (
                <Button onClick={runFetch} loading={isPending} disabled={isPending}>
                  {hasSources ? t('common.fetchNow') : t('home.gettingStarted.step2')}
                </Button>
              )}
            </>
          }
          secondary={
            <Link
              to="/settings/context"
              className={cn(
                'inline-flex min-h-10 items-center rounded-md border border-border px-3 py-2 text-sm text-accent hover:border-accent/50',
                focusRingClass(),
              )}
            >
              {t('home.gettingStarted.stepContext')}
            </Link>
          }
        />
      ) : null}

      {alerts.length > 0 ? (
        <div
          className="mb-6 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-sm"
          role="status"
          aria-label={t('today.proactiveTitle')}
        >
          <p className="font-medium text-accent">{t('today.proactiveTitle')}</p>
          <p className="mt-1 text-ink">{alerts[0]?.title ?? alerts[0]?.label}</p>
          {alerts[0]?.changeId ? (
            <Link
              to={`/changes/${alerts[0].changeId}`}
              className={`mt-2 inline-flex min-h-9 items-center text-xs ${textLinkClass()}`}
            >
              {t('today.reviewChange')}
            </Link>
          ) : null}
        </div>
      ) : null}

      {revisit.length > 0 ? (
        <div
          className="mb-6 rounded-lg border border-moss/30 bg-moss/5 px-4 py-3"
          role="status"
          aria-label={t('today.revisitTitle')}
        >
          <p className="text-sm font-medium text-moss">{t('today.revisitTitle')}</p>
          <p className="mt-1 text-sm text-ink">
            {t('today.revisitBody', {
              title: revisit[0].changeTitle ?? '',
              updates: revisit[0].updatesSinceDecision ?? 0,
            })}
          </p>
          <Link
            to="/decisions"
            className={`mt-2 inline-flex min-h-9 items-center text-xs ${textLinkClass('moss')}`}
          >
            {t('today.openDecisions')}
          </Link>
        </div>
      ) : null}

      {ready ? (
        <>
          <p className="mb-4 text-base font-medium text-ink">
            {t('today.attentionCount', { count: majorCount })}
          </p>

          {major.length > 0 ? (
            <ChangeAttentionList
              cards={major}
              busyEventId={busyEventId}
              onFollow={(c) => c.eventId && followMut.mutate(c.eventId)}
              onDismiss={(c) => c.eventId && dismissMut.mutate(c.eventId)}
            />
          ) : null}

          <div className="mt-6">
            <Link
              to="/radar"
              className={cn(
                'inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-ink transition motion-reduce:transition-none hover:border-accent/40 hover:text-accent',
                focusRingClass(),
              )}
            >
              {t('today.exploreLink')}
            </Link>
          </div>

          {following.length > 0 ? (
            <section className="mt-8" aria-labelledby="today-following-heading">
              <h2
                id="today-following-heading"
                className="font-mono text-[10px] uppercase tracking-wider text-faint"
              >
                {t('today.followingSection')}
              </h2>
              <ul className="mt-2 space-y-1.5">
                {following.map((card) => (
                  <li key={`follow-${card.eventId}`}>
                    <Link
                      to={`/changes/${card.changeId ?? card.eventId}`}
                      className={`inline-flex min-h-9 items-center text-sm ${textLinkClass()}`}
                    >
                      {card.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {minor.length > 0 ? (
            <section className="mt-8 border-t border-border pt-6" aria-labelledby="today-minor-heading">
              <h2 id="today-minor-heading" className="text-sm font-medium text-muted">
                {t('today.moreSignals', { count: minor.length })}
              </h2>
              <ul className="mt-3 space-y-2">
                {minor.map((card) => (
                  <li key={card.id ?? card.eventId} className="text-sm">
                    <Link
                      to={`/changes/${card.eventId}`}
                      state={{ from: '/' }}
                      className={cn(
                        'inline-flex min-h-9 items-center rounded-sm text-ink hover:text-accent',
                        focusRingClass(),
                      )}
                    >
                      {card.title}
                    </Link>
                    {card.why ? <p className="text-xs text-muted line-clamp-1">{card.why}</p> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-8 border-t border-border pt-6" aria-labelledby="today-brief-heading">
            <h2
              id="today-brief-heading"
              className="font-mono text-[10px] uppercase tracking-wider text-faint"
            >
              {t('today.dailyBrief')}
            </h2>
            <p className="mt-1 text-sm text-muted">{t('today.dailyBriefHint')}</p>
            <Link
              to={`/briefs/${briefDate}`}
              className={`mt-2 inline-flex min-h-9 items-center text-sm ${textLinkClass()}`}
            >
              {t('today.viewBrief')}
            </Link>
          </section>

          <p className="mt-6 text-xs text-muted">
            <Link to="/radar" className={`inline-flex min-h-9 items-center ${textLinkClass()}`}>
              {t('today.exploreLink')}
            </Link>
            {' · '}
            <Link
              to="/settings/context"
              className={`inline-flex min-h-9 items-center ${textLinkClass()}`}
            >
              {t('today.configureContext')}
            </Link>
          </p>
        </>
      ) : null}
    </div>
  )
}
