import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ImpactCard, type IntelligenceHome } from '../lib/api'
import {
  Button,
  EmptyState,
  ListSkeleton,
  PageHeader,
  QueryErrorState,
  useToast,
} from '../components/ui'
import { RadarDeck } from '../components/today/RadarDeck'
import { PackPicker } from '../components/PackPicker'
import { FetchProgressSection } from '../components/fetch/FetchProgressSection'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { useEngagement } from '../hooks/useEngagement'
import { useSources } from '../hooks/useSources'
import { useDisplaySources } from '../hooks/useDisplaySources'
import { useChangeSourceMap } from '../hooks/useChangeSourceMap'
import { useUnreadCounts } from '../hooks/useUnreadCounts'
import { entityMatchesDisplay, impactEventMatchesDisplay } from '../lib/sourceFilter'
import { errorText } from '../lib/errors'
import { dateLocale } from '../i18n'
import { cn, focusRingClass, textLinkClass } from '../lib/cn'

function removeHomeMajor(
  prev: IntelligenceHome | undefined,
  eventId: number,
): IntelligenceHome | undefined {
  if (!prev) return prev
  const strip = (list?: ImpactCard[]) =>
    (list ?? []).filter((c) => c.eventId !== eventId && c.changeId !== eventId)
  return {
    ...prev,
    majorChanges: strip(prev.majorChanges),
    todayChanges: strip(prev.todayChanges),
    whyCare: strip(prev.whyCare),
    impacts: strip(prev.impacts),
  }
}

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
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const engagement = useEngagement()
  const home = useQuery({ queryKey: ['intelligence-home'], queryFn: api.intelligenceHome })
  const sources = useSources()
  const unread = useUnreadCounts()
  const { displaySourceIds, noneSelected, sourceIdsQuery, setAllDisplayed } = useDisplaySources()
  const changeSourceMap = useChangeSourceMap()

  const { fetchJob, retryFailed, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['intelligence-home'],
    ['changes-watching'],
    ['changes-list'],
    ['feed'],
    ['watching-timeline'],
    ['unread-counts'],
    ['sources'],
    ['decisions'],
    ['decisions-due'],
  ])
  /** Cards watched this session — shown under Following after optimistic deck removal. */
  const [sessionWatched, setSessionWatched] = useState<ImpactCard[]>([])

  const impactJob = useMutation({
    mutationFn: api.impactJob,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      pushToast('success', t(engagement.fetchDoneToastKey()))
    },
    onError: (err) => pushToast('error', errorText(err, t)),
  })

  const removeMajorOptimistic = useCallback(
    (eventId: number) => {
      qc.setQueryData<IntelligenceHome>(['intelligence-home'], (prev) =>
        removeHomeMajor(prev, eventId),
      )
    },
    [qc],
  )

  const dismissMut = useMutation({
    mutationFn: (changeId: number) => api.dismissChange(changeId),
    onMutate: async (changeId) => {
      await qc.cancelQueries({ queryKey: ['intelligence-home'] })
      const prev = qc.getQueryData<IntelligenceHome>(['intelligence-home'])
      removeMajorOptimistic(changeId)
      return { prev }
    },
    onSuccess: (_data, changeId, ctx) => {
      pushToast('success', t('today.dismissed'), {
        label: t('common.undo'),
        onClick: () => {
          void api
            .undismissChange(changeId)
            .then(() => {
              if (ctx?.prev) qc.setQueryData(['intelligence-home'], ctx.prev)
              void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
            })
            .catch(() => undefined)
        },
      })
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(['intelligence-home'], ctx.prev)
      pushToast('error', errorText(err, t))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
    },
  })

  const followMut = useMutation({
    mutationFn: (changeId: number) => api.putWatch(changeId, { capability: true, api: true }),
    onMutate: async (changeId) => {
      await qc.cancelQueries({ queryKey: ['intelligence-home'] })
      const prev = qc.getQueryData<IntelligenceHome>(['intelligence-home'])
      removeMajorOptimistic(changeId)
      return { prev }
    },
    onSuccess: async (_data, changeId, ctx) => {
      await qc.invalidateQueries({ queryKey: ['watching-timeline'] })
      await qc.invalidateQueries({ queryKey: ['changes-watching'] })
      pushToast('success', t('today.followed'), {
        label: t('common.undo'),
        onClick: () => {
          void api
            .deleteWatch(changeId)
            .then(() => {
              if (ctx?.prev) qc.setQueryData(['intelligence-home'], ctx.prev)
              setSessionWatched((prev) =>
                prev.filter((x) => (x.eventId ?? x.changeId) !== changeId),
              )
              void qc.invalidateQueries({ queryKey: ['watching-timeline'] })
              void qc.invalidateQueries({ queryKey: ['changes-watching'] })
              void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
            })
            .catch(() => undefined)
        },
      })
    },
    onError: (err, changeId, ctx) => {
      if (ctx?.prev) qc.setQueryData(['intelligence-home'], ctx.prev)
      setSessionWatched((prev) =>
        prev.filter((x) => (x.eventId ?? x.changeId) !== changeId),
      )
      pushToast('error', errorText(err, t))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
    },
  })

  const unfollowMut = useMutation({
    mutationFn: (changeId: number) => api.deleteWatch(changeId),
    onMutate: async (changeId) => {
      await qc.cancelQueries({ queryKey: ['intelligence-home'] })
      await qc.cancelQueries({ queryKey: ['watching-timeline'] })
      const prevHome = qc.getQueryData<IntelligenceHome>(['intelligence-home'])
      const prevTimeline = qc.getQueryData<{ groups: { eventId: number }[]; count: number }>([
        'watching-timeline',
      ])
      const prevSession = sessionWatched
      setSessionWatched((prev) =>
        prev.filter((x) => (x.eventId ?? x.changeId) !== changeId),
      )
      qc.setQueryData<IntelligenceHome>(['intelligence-home'], (old) => {
        if (!old?.following) return old
        return {
          ...old,
          following: old.following.filter(
            (c) => (c.eventId ?? c.changeId) !== changeId,
          ),
        }
      })
      qc.setQueryData<{ groups: { eventId: number }[]; count: number }>(
        ['watching-timeline'],
        (old) => {
          if (!old) return old
          const groups = old.groups.filter((g) => g.eventId !== changeId)
          return { ...old, groups, count: groups.length }
        },
      )
      return { prevHome, prevTimeline, prevSession }
    },
    onSuccess: (_data, changeId) => {
      pushToast('success', t('today.unfollowed'), {
        label: t('common.undo'),
        onClick: () => {
          void api
            .putWatch(changeId, { capability: true, api: true })
            .then(() => {
              void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
              void qc.invalidateQueries({ queryKey: ['watching-timeline'] })
              void qc.invalidateQueries({ queryKey: ['changes-watching'] })
            })
            .catch(() => undefined)
        },
      })
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prevHome) qc.setQueryData(['intelligence-home'], ctx.prevHome)
      if (ctx?.prevTimeline) qc.setQueryData(['watching-timeline'], ctx.prevTimeline)
      if (ctx?.prevSession) setSessionWatched(ctx.prevSession)
      pushToast('error', errorText(err, t))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      void qc.invalidateQueries({ queryKey: ['watching-timeline'] })
      void qc.invalidateQueries({ queryKey: ['changes-watching'] })
    },
  })

  const snoozeRevisitMut = useMutation({
    mutationFn: (decisionId: number) => api.snoozeDecision(decisionId, 7),
    onMutate: async (decisionId) => {
      await qc.cancelQueries({ queryKey: ['intelligence-home'] })
      await qc.cancelQueries({ queryKey: ['decisions-due'] })
      const prevHome = qc.getQueryData<IntelligenceHome>(['intelligence-home'])
      const prevDue = qc.getQueryData(['decisions-due'])
      const removed = prevHome?.decisionsToRevisit?.find((d) => d.id === decisionId)
      qc.setQueryData<IntelligenceHome>(['intelligence-home'], (old) => {
        if (!old?.decisionsToRevisit) return old
        return {
          ...old,
          decisionsToRevisit: old.decisionsToRevisit.filter((d) => d.id !== decisionId),
        }
      })
      qc.setQueryData(['decisions-due'], (old: unknown) =>
        Array.isArray(old) ? old.filter((d: { id?: number }) => d.id !== decisionId) : old,
      )
      return { prevHome, prevDue, prevRevisit: removed?.revisitAt }
    },
    onSuccess: (_data, decisionId, ctx) => {
      if (ctx?.prevRevisit) {
        pushToast('success', t('decisions.snoozeDone'), {
          label: t('common.undo'),
          onClick: () => {
            void api
              .restoreDecisionRevisit(decisionId, ctx.prevRevisit!)
              .then(() => {
                if (ctx.prevHome) qc.setQueryData(['intelligence-home'], ctx.prevHome)
                if (ctx.prevDue) qc.setQueryData(['decisions-due'], ctx.prevDue)
                void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
                void qc.invalidateQueries({ queryKey: ['decisions-due'] })
              })
              .catch(() => undefined)
          },
        })
      } else {
        pushToast('success', t('decisions.snoozeDone'))
      }
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prevHome) qc.setQueryData(['intelligence-home'], ctx.prevHome)
      if (ctx?.prevDue) qc.setQueryData(['decisions-due'], ctx.prevDue)
      pushToast('error', errorText(err, t))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      void qc.invalidateQueries({ queryKey: ['decisions'] })
      void qc.invalidateQueries({ queryKey: ['decisions-due'] })
    },
  })

  const onDeckCleared = useCallback(() => {
    if (engagement.claimDeckCleared()) {
      pushToast('success', t(engagement.deckClearToastKey()))
    }
  }, [engagement, pushToast, t])

  const onInvestigate = useCallback(
    (card: ImpactCard) => {
      const id = card.changeId ?? card.eventId
      if (id) navigate(`/changes/${id}`, { state: { from: '/' } })
    },
    [navigate],
  )

  const onDecide = useCallback(
    (card: ImpactCard) => {
      const id = card.changeId ?? card.eventId
      if (id) navigate(`/changes/${id}`, { state: { from: '/', focus: 'decision' } })
    },
    [navigate],
  )

  const data = home.data
  const sourceCount = sources.data?.length ?? 0
  const hasSources = sourceCount > 0
  // Match shell badges: display-none → 0, ignore stale unread-counts cache.
  const feedUnread = (() => {
    if (noneSelected) return 0
    const m = unread.data ?? {}
    if (typeof m.total === 'number') return m.total
    return Object.entries(m).reduce((sum, [k, n]) => (k === 'total' ? sum : sum + n), 0)
  })()
  const hasFeed = feedUnread > 0
  const filterCard = (card: ImpactCard) =>
    entityMatchesDisplay(card, changeSourceMap, displaySourceIds)

  // Full major queue for triage (soft cap avoids pathological home payloads).
  const major = (data?.majorChanges ?? data?.todayChanges ?? []).filter(filterCard).slice(0, 20)
  const minor = (data?.minorSignals ?? []).filter(filterCard).slice(0, 8)
  // Server following + session watches (instant UX before home refetch).
  const following = (() => {
    const byKey = new Map<number, ImpactCard>()
    for (const c of data?.following ?? []) {
      const key = c.eventId ?? c.changeId
      if (key != null && filterCard(c)) byKey.set(key, c)
    }
    for (const c of sessionWatched) {
      const key = c.eventId ?? c.changeId
      if (key != null && filterCard(c)) byKey.set(key, c)
    }
    return Array.from(byKey.values()).slice(0, 12)
  })()
  const revisit = (data?.decisionsToRevisit ?? [])
    .filter((d) => entityMatchesDisplay(d, changeSourceMap, displaySourceIds))
    .slice(0, 1)
  const alerts = (data?.proactiveAlerts ?? []).filter((a) =>
    impactEventMatchesDisplay(a.changeId, changeSourceMap, displaySourceIds),
  )
  const majorCount = major.length
  // Following alone is still a valid Today surface (don't show "getting started").
  const ready = major.length > 0 || minor.length > 0 || following.length > 0
  // Unfiltered home payload still has triage — display scope hid everything.
  const unfilteredReady =
    (data?.majorChanges ?? data?.todayChanges ?? []).length > 0 ||
    (data?.minorSignals ?? []).length > 0 ||
    (data?.following ?? []).length > 0 ||
    sessionWatched.length > 0
  const displayFilterEmpty = !ready && !noneSelected && unfilteredReady
  const deckBusy = dismissMut.isPending || followMut.isPending || unfollowMut.isPending
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
        titleId="today-page-heading"
        title={t(greetingKey(hour))}
        subtitle={dateLabel}
        actions={
          <Button
            id="today-fetch-btn"
            onClick={runFetch}
            loading={isPending}
            disabled={isPending}
            aria-label={phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
          >
            {phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
          </Button>
        }
      />

      <FetchProgressSection
        phase={phase}
        progress={progress}
        onDismiss={() => {
          void dismiss()
          queueMicrotask(() => document.getElementById('today-fetch-btn')?.focus())
        }}
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

      {!home.isLoading && !home.isError && !ready && noneSelected ? (
        <EmptyState
          title={t('sources.displayNoneActive')}
          description={t('today.displayNoneHint')}
          primary={
            <Button onClick={setAllDisplayed} aria-label={t('sources.displayRestoreAll')}>
              {t('sources.displayRestoreAll')}
            </Button>
          }
          secondary={
            <Link
              to="/settings/sources"
              aria-label={t('nav.sources')}
              className={cn(
                'inline-flex min-h-10 items-center rounded-md border border-border px-3 py-2 text-sm text-accent hover:border-accent/50',
                focusRingClass(),
              )}
            >
              {t('nav.sources')}
            </Link>
          }
        />
      ) : null}

      {!home.isLoading && !home.isError && displayFilterEmpty ? (
        <EmptyState
          title={t('today.displayFilterEmpty')}
          description={t('today.displayFilterEmptyHint')}
          primary={
            <Button onClick={setAllDisplayed} aria-label={t('sources.displayRestoreAll')}>
              {t('sources.displayRestoreAll')}
            </Button>
          }
          secondary={
            <Link
              to="/settings/sources"
              aria-label={t('nav.sources')}
              className={cn(
                'inline-flex min-h-10 items-center rounded-md border border-border px-3 py-2 text-sm text-accent hover:border-accent/50',
                focusRingClass(),
              )}
            >
              {t('nav.sources')}
            </Link>
          }
        />
      ) : null}

      {!home.isLoading && !home.isError && !ready && !noneSelected && !displayFilterEmpty ? (
        <EmptyState
          title={
            !hasSources
              ? t('home.gettingStarted.title')
              : hasFeed
                ? t('home.gettingStarted.hasFeedTitle', { count: feedUnread })
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
                    aria-label={t('home.gettingStarted.browseRadar')}
                    className={cn(
                      'inline-flex min-h-10 items-center rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition motion-reduce:transition-none hover:bg-accent/90',
                      focusRingClass(),
                    )}
                  >
                    {t('home.gettingStarted.browseRadar')}
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => impactJob.mutate()}
                    loading={impactJob.isPending}
                    disabled={impactJob.isPending || isPending}
                    aria-label={t('home.gettingStarted.recomputeImpact')}
                  >
                    {t('home.gettingStarted.recomputeImpact')}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={runFetch}
                  loading={isPending}
                  disabled={isPending}
                  aria-label={hasSources ? t('common.fetchNow') : t('home.gettingStarted.step2')}
                >
                  {hasSources ? t('common.fetchNow') : t('home.gettingStarted.step2')}
                </Button>
              )}
            </>
          }
          secondary={
            <Link
              to="/settings/context"
              aria-label={t('home.gettingStarted.stepContext')}
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
          aria-labelledby="today-proactive-heading"
        >
          <p id="today-proactive-heading" className="font-medium text-accent">
            {t('today.proactiveTitle')}
          </p>
          <p className="mt-1 text-ink">{alerts[0]?.title ?? alerts[0]?.label}</p>
          {alerts[0]?.changeId ? (
            <Link
              to={`/changes/${alerts[0].changeId}`}
              aria-label={t('today.reviewChange')}
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
          aria-labelledby="today-revisit-heading"
        >
          <p id="today-revisit-heading" className="text-sm font-medium text-moss">
            {t('today.revisitTitle')}
          </p>
          <p className="mt-1 text-sm text-ink">
            {t('today.revisitBody', {
              title: revisit[0].changeTitle ?? '',
              updates: revisit[0].updatesSinceDecision ?? 0,
            })}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {revisit[0].changeId ? (
              <Link
                to={`/changes/${revisit[0].changeId}`}
                state={{ from: '/', focus: 'decision' }}
                aria-label={t('today.reviewChange')}
                className={`inline-flex min-h-9 items-center text-xs ${textLinkClass('moss')}`}
              >
                {t('today.reviewChange')}
              </Link>
            ) : null}
            {revisit[0].id != null ? (
              <button
                type="button"
                disabled={snoozeRevisitMut.isPending}
                onClick={() => snoozeRevisitMut.mutate(revisit[0].id)}
                aria-label={t('decisions.snoozeAria', {
                  title: revisit[0].changeTitle ?? '',
                })}
                className={cn(
                  'inline-flex min-h-9 items-center text-xs',
                  textLinkClass('moss'),
                  focusRingClass(),
                )}
              >
                {t('decisions.snooze')}
              </button>
            ) : null}
            <Link
              to="/decisions"
              aria-label={t('today.openDecisions')}
              className={`inline-flex min-h-9 items-center text-xs ${textLinkClass('moss')}`}
            >
              {t('today.openDecisions')}
            </Link>
          </div>
        </div>
      ) : null}

      {ready ? (
        <>
          {majorCount > 0 || minor.length > 0 ? (
            <p
              id="today-attention-count"
              tabIndex={-1}
              className="mb-4 text-base font-medium text-ink outline-none"
              aria-live="polite"
            >
              {t('today.attentionCount', { count: majorCount })}
            </p>
          ) : null}

          {major.length > 0 ? (
            <RadarDeck
              cards={major}
              resetKey={sourceIdsQuery ?? 'all'}
              busy={deckBusy}
              onWatch={(c) => {
                const id = c.eventId ?? c.changeId
                if (!id) return
                setSessionWatched((prev) => {
                  const key = c.eventId ?? c.changeId
                  return [c, ...prev.filter((x) => (x.eventId ?? x.changeId) !== key)]
                })
                followMut.mutate(id)
              }}
              onDismiss={(c) => {
                const id = c.eventId ?? c.changeId
                if (id) dismissMut.mutate(id)
              }}
              onInvestigate={onInvestigate}
              onDecide={onDecide}
              onCleared={onDeckCleared}
            />
          ) : null}

          {following.length > 0 ? (
            <section
              className={major.length > 0 || minor.length > 0 ? 'mt-8' : undefined}
              aria-labelledby="today-following-heading"
            >
              <h2
                id="today-following-heading"
                className="font-mono text-[10px] uppercase tracking-wider text-faint"
              >
                {t('today.followingSection')}
              </h2>
              <ul className="mt-2 space-y-1.5">
                {following.map((card) => {
                  const id = card.changeId ?? card.eventId
                  const pending =
                    unfollowMut.isPending && unfollowMut.variables === id
                  return (
                    <li
                      key={`follow-${card.eventId}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <Link
                        to={`/changes/${id}`}
                        className={`min-w-0 flex-1 truncate inline-flex min-h-9 items-center text-sm ${textLinkClass()}`}
                      >
                        {card.title}
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        loading={pending}
                        disabled={unfollowMut.isPending}
                        onClick={() => id != null && unfollowMut.mutate(id)}
                        aria-label={`${t('today.unfollow')}: ${card.title}`}
                      >
                        {t('today.unfollow')}
                      </Button>
                    </li>
                  )
                })}
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
