import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ApiError, api, type ChangeCard, type ImpactCard, type IntelligenceHome } from '../lib/api'
import { FeedbackBar } from '../components/feedback/FeedbackBar'
import { DecisionForm, type DecisionKind } from '../components/change/DecisionForm'
import {
  Button,
  EmptyState,
  ImmersiveDrawer,
  ItemDetailBody,
  ListSkeleton,
  PageHeader,
  QueryErrorState,
  ScorePill,
  StatusBadge,
  useToast,
  isZhihuSource,
} from '../components/ui'
import { useDisplaySources } from '../hooks/useDisplaySources'
import { useEngagement } from '../hooks/useEngagement'
import { useEscapeBack } from '../hooks/useEscapeBack'
import { useMarkItemRead } from '../hooks/useMarkItemRead'
import { useSettings } from '../hooks/useSettings'
import { changeMatchesDisplay, itemMatchesDisplay } from '../lib/sourceFilter'
import { dateLocale } from '../i18n'
import { errorText } from '../lib/errors'
import { needsImpactRefresh } from '../lib/impactCopy'
import { revisitDayDelta } from '../lib/format'
import { prefersReducedMotion } from '../lib/a11y'
import { cn, focusRingClass, textLinkClass } from '../lib/cn'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

type LocationState = { from?: string; focus?: 'decision' }

function stripHomeMajor(
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
    minorSignals: strip(prev.minorSignals),
  }
}

function decisionKindLabel(kind: string, t: (key: string) => string) {
  switch (kind) {
    case 'watch':
      return t('decisions.kindWatch')
    case 'investigate':
      return t('decisions.kindInvestigate')
    case 'adopt':
      return t('decisions.kindAdopt')
    case 'ignore':
      return t('decisions.kindIgnore')
    default:
      return kind
  }
}

function decisionRevisitLabel(
  iso: string,
  locale: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  const days = revisitDayDelta(iso)
  if (days == null) return new Date(iso).toLocaleDateString(locale)
  if (days < 0) return t('decisions.revisitOverdue', { count: Math.abs(days) })
  if (days === 0) return t('decisions.revisitToday')
  if (days <= 7) return t('decisions.revisitIn', { count: days })
  return new Date(iso).toLocaleDateString(locale)
}

export default function ChangeDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const changeId = Number(id)
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const engagement = useEngagement()
  const [readerItemId, setReaderItemId] = useState<number | null>(null)
  const focusDecision = (location.state as LocationState | null)?.focus === 'decision'
  const [showDecision, setShowDecision] = useState(focusDecision)
  const { displaySourceIds, setAllDisplayed, setDisplayedIds } = useDisplaySources()
  const settings = useSettings()
  const markItemRead = useMarkItemRead()
  const q = useQuery({
    queryKey: ['change', changeId],
    queryFn: () => api.change(changeId),
    enabled: Number.isFinite(changeId),
    retry: (count, err) => {
      if (err instanceof ApiError && err.status === 404) return false
      return count < 2
    },
  })
  useDocumentTitle({ title: q.data?.title ?? null })
  const locale = dateLocale(i18n.language)
  const staleImpact = needsImpactRefresh(
    settings.data?.summaryLanguage,
    q.data?.why,
    q.data?.recommendation,
  )

  const fromState = (location.state as LocationState | null)?.from
  const fallbackFrom = fromState ?? '/radar?view=changes'
  const canGoBack = Boolean(fromState) && window.history.length > 1

  const goBack = useCallback(() => {
    if (canGoBack) {
      navigate(-1)
      return
    }
    navigate(fallbackFrom, { replace: !fromState })
  }, [canGoBack, fallbackFrom, fromState, navigate])

  useEscapeBack(goBack, readerItemId == null && !showDecision)

  useEffect(() => {
    if (!focusDecision) return
    setShowDecision(true)
  }, [focusDecision, changeId])

  // Scroll after detail loads — skeleton has no #change-decision yet.
  useEffect(() => {
    if (!focusDecision || !showDecision || q.isLoading || !q.data) return
    const reduce = prefersReducedMotion()
    let tries = 0
    let raf = 0
    const scroll = () => {
      const el = document.getElementById('change-decision')
      if (el) {
        el.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
        return
      }
      if (tries++ < 12) raf = window.requestAnimationFrame(scroll)
    }
    raf = window.requestAnimationFrame(scroll)
    return () => window.cancelAnimationFrame(raf)
  }, [focusDecision, showDecision, q.isLoading, q.data, changeId])

  // Same reader loop as Radar: opening in-app detail clears unread.
  const markReadMutate = markItemRead.mutate
  useEffect(() => {
    if (readerItemId == null) return
    const item = (q.data?.items ?? []).find((i) => i.id === readerItemId)
    if (!item || item.read) return
    markReadMutate({
      id: item.id,
      read: true,
      silent: true,
      sourceType: item.primarySourceType,
    })
  }, [readerItemId, q.data?.items, markReadMutate])

  const decisionMut = useMutation({
    mutationFn: (body: { kind: DecisionKind; reason: string; revisitAt: string }) =>
      api.postChangeDecision(changeId, {
        kind: body.kind,
        reason: body.reason.trim() || undefined,
        revisitAt: body.revisitAt || undefined,
      }),
    onMutate: async (vars) => {
      // Leave Today triage immediately so “back to Today” doesn’t show the same card.
      await qc.cancelQueries({ queryKey: ['intelligence-home'] })
      await qc.cancelQueries({ queryKey: ['change', changeId] })
      const prevHome = qc.getQueryData<IntelligenceHome>(['intelligence-home'])
      const prevChange = qc.getQueryData<ChangeCard>(['change', changeId])
      qc.setQueryData<IntelligenceHome>(['intelligence-home'], (old) => {
        const stripped = stripHomeMajor(old, changeId)
        if (!stripped) return stripped
        if (vars.kind === 'ignore') {
          const drop = (list?: ImpactCard[]) =>
            (list ?? []).filter((c) => (c.eventId ?? c.changeId) !== changeId)
          return { ...stripped, following: drop(stripped.following) }
        }
        if (vars.kind !== 'watch' || !prevChange) return stripped
        const card: ImpactCard = {
          id: changeId,
          eventId: changeId,
          changeId,
          title: prevChange.title,
          summary: prevChange.summary,
          watched: true,
        }
        const following = [
          card,
          ...(stripped.following ?? []).filter(
            (c) => (c.eventId ?? c.changeId) !== changeId,
          ),
        ]
        return { ...stripped, following }
      })
      if (vars.kind === 'watch' && prevChange) {
        qc.setQueryData<ChangeCard>(['change', changeId], { ...prevChange, watched: true })
      } else if (vars.kind === 'ignore' && prevChange) {
        qc.setQueryData<ChangeCard>(['change', changeId], { ...prevChange, watched: false })
      }
      return { prevHome, prevChange }
    },
    onSuccess: async (data, vars, ctx) => {
      qc.setQueryData<ChangeCard>(['change', changeId], (old) =>
        old
          ? {
              ...old,
              latestDecision: data,
              watched:
                vars.kind === 'watch' ? true : vars.kind === 'ignore' ? false : old.watched,
            }
          : old,
      )
      setShowDecision(false)
      const touchWatching = vars.kind === 'watch' || vars.kind === 'ignore'
      const invalidateDecisionSurfaces = () =>
        Promise.all([
          qc.invalidateQueries({ queryKey: ['decisions'] }),
          qc.invalidateQueries({ queryKey: ['decisions-due'] }),
          qc.invalidateQueries({ queryKey: ['intelligence-home'] }),
          qc.invalidateQueries({ queryKey: ['change', changeId] }),
          qc.invalidateQueries({ queryKey: ['watching-timeline'] }),
          qc.invalidateQueries({ queryKey: ['changes-watching'] }),
        ])
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['decisions'] }),
        qc.invalidateQueries({ queryKey: ['decisions-due'] }),
        qc.invalidateQueries({ queryKey: ['intelligence-home'] }),
        qc.invalidateQueries({ queryKey: ['change', changeId] }),
        touchWatching
          ? Promise.all([
              qc.invalidateQueries({ queryKey: ['watching-timeline'] }),
              qc.invalidateQueries({ queryKey: ['changes-watching'] }),
            ])
          : Promise.resolve(),
      ])
      const prevDecision = ctx?.prevChange?.latestDecision
      const prevWatched = Boolean(ctx?.prevChange?.watched)
      const canUndo = Boolean(data?.id)
      pushToast('success', t(engagement.decisionToastKey()), {
        label: canUndo
          ? t('common.undo')
          : vars.kind === 'watch'
            ? t('nav.watching')
            : fromState === '/'
              ? t('decisions.browseToday')
              : t('decisions.viewList'),
        onClick: () => {
          if (!canUndo) {
            navigate(vars.kind === 'watch' ? '/watching' : fromState === '/' ? '/' : '/decisions')
            return
          }
          void (async () => {
            try {
              await api.withdrawDecision(data.id)
              if (prevDecision) {
                await api.postChangeDecision(changeId, {
                  kind: prevDecision.kind,
                  reason: prevDecision.reason,
                  revisitAt: prevDecision.revisitAt,
                })
                // watch/ignore kinds adjust Follow; restore Follow for other kinds.
                if (prevDecision.kind !== 'watch' && prevDecision.kind !== 'ignore') {
                  if (prevWatched) {
                    await api.putWatch(changeId, { capability: true, api: true })
                  } else {
                    await api.deleteWatch(changeId).catch(() => undefined)
                  }
                }
              } else if (vars.kind === 'ignore' && prevWatched) {
                await api.putWatch(changeId, { capability: true, api: true })
              }
              if (ctx?.prevChange) qc.setQueryData(['change', changeId], ctx.prevChange)
              if (ctx?.prevHome) qc.setQueryData(['intelligence-home'], ctx.prevHome)
              await invalidateDecisionSurfaces()
            } catch {
              /* toast already consumed */
            }
          })()
        },
      })
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prevHome) qc.setQueryData(['intelligence-home'], ctx.prevHome)
      if (ctx?.prevChange) qc.setQueryData(['change', changeId], ctx.prevChange)
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
    },
  })

  const snoozeMut = useMutation({
    mutationFn: (decisionId: number) => api.snoozeDecision(decisionId, 7),
    onMutate: async (decisionId) => {
      await qc.cancelQueries({ queryKey: ['change', changeId] })
      await qc.cancelQueries({ queryKey: ['decisions-due'] })
      const prevChange = qc.getQueryData<ChangeCard>(['change', changeId])
      const prevDue = qc.getQueryData(['decisions-due'])
      const prevRevisit = prevChange?.latestDecision?.revisitAt
      const nextIso = new Date()
      nextIso.setUTCDate(nextIso.getUTCDate() + 7)
      nextIso.setUTCHours(0, 0, 0, 0)
      qc.setQueryData<ChangeCard>(['change', changeId], (old) => {
        if (!old?.latestDecision || old.latestDecision.id !== decisionId) return old
        return {
          ...old,
          latestDecision: { ...old.latestDecision, revisitAt: nextIso.toISOString() },
        }
      })
      qc.setQueryData(['decisions-due'], (old: unknown) =>
        Array.isArray(old) ? old.filter((d: { id?: number }) => d.id !== decisionId) : old,
      )
      return { prevChange, prevDue, prevRevisit }
    },
    onSuccess: (_data, decisionId, ctx) => {
      if (ctx?.prevRevisit) {
        pushToast('success', t('decisions.snoozeDone'), {
          label: t('common.undo'),
          onClick: () => {
            void api
              .restoreDecisionRevisit(decisionId, ctx.prevRevisit!)
              .then(() => {
                if (ctx.prevChange) qc.setQueryData(['change', changeId], ctx.prevChange)
                if (ctx.prevDue) qc.setQueryData(['decisions-due'], ctx.prevDue)
                void qc.invalidateQueries({ queryKey: ['change', changeId] })
                void qc.invalidateQueries({ queryKey: ['decisions-due'] })
                void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
              })
              .catch(() => undefined)
          },
        })
      } else {
        pushToast('success', t('decisions.snoozeDone'))
      }
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prevChange) qc.setQueryData(['change', changeId], ctx.prevChange)
      if (ctx?.prevDue) qc.setQueryData(['decisions-due'], ctx.prevDue)
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['change', changeId] })
      void qc.invalidateQueries({ queryKey: ['decisions'] })
      void qc.invalidateQueries({ queryKey: ['decisions-due'] })
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
    },
  })

  const watchMut = useMutation({
    mutationFn: (watched: boolean) =>
      watched
        ? api.putWatch(changeId, { capability: true, api: true })
        : api.deleteWatch(changeId),
    onMutate: async (watched) => {
      await qc.cancelQueries({ queryKey: ['change', changeId] })
      await qc.cancelQueries({ queryKey: ['intelligence-home'] })
      await qc.cancelQueries({ queryKey: ['watching-timeline'] })
      const prev = qc.getQueryData<ChangeCard>(['change', changeId])
      const prevHome = qc.getQueryData<IntelligenceHome>(['intelligence-home'])
      const prevTimeline = qc.getQueryData<{ groups: { eventId: number }[]; count: number }>([
        'watching-timeline',
      ])
      if (prev) qc.setQueryData(['change', changeId], { ...prev, watched })
      if (!watched) {
        qc.setQueryData<IntelligenceHome>(['intelligence-home'], (old) => {
          if (!old) return old
          const drop = (list?: ImpactCard[]) =>
            (list ?? []).filter((c) => (c.eventId ?? c.changeId) !== changeId)
          return { ...old, following: drop(old.following) }
        })
        qc.setQueryData<{ groups: { eventId: number }[]; count: number }>(
          ['watching-timeline'],
          (old) => {
            if (!old) return old
            const groups = old.groups.filter((g) => g.eventId !== changeId)
            return { ...old, groups, count: groups.length }
          },
        )
      } else if (prev) {
        // Follow: put card into Today following immediately.
        const card: ImpactCard = {
          id: changeId,
          eventId: changeId,
          changeId,
          title: prev.title,
          watched: true,
        }
        qc.setQueryData<IntelligenceHome>(['intelligence-home'], (old) => {
          if (!old) return old
          const rest = (old.following ?? []).filter(
            (c) => (c.eventId ?? c.changeId) !== changeId,
          )
          return { ...old, following: [card, ...rest] }
        })
      }
      return { prev, prevHome, prevTimeline }
    },
    onSuccess: (_data, watched, ctx) => {
      if (watched) {
        pushToast('success', t('today.followed'), {
          label: t('common.undo'),
          onClick: () => {
            void api
              .deleteWatch(changeId)
              .then(() => {
                if (ctx?.prev) qc.setQueryData(['change', changeId], ctx.prev)
                if (ctx?.prevHome) qc.setQueryData(['intelligence-home'], ctx.prevHome)
                if (ctx?.prevTimeline) qc.setQueryData(['watching-timeline'], ctx.prevTimeline)
                void qc.invalidateQueries({ queryKey: ['change', changeId] })
                void qc.invalidateQueries({ queryKey: ['watching-timeline'] })
                void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
                void qc.invalidateQueries({ queryKey: ['changes-watching'] })
              })
              .catch(() => undefined)
          },
        })
      } else {
        pushToast('success', t('today.unfollowed'), {
          label: t('common.undo'),
          onClick: () => {
            void api
              .putWatch(changeId, { capability: true, api: true })
              .then(() => {
                void qc.invalidateQueries({ queryKey: ['change', changeId] })
                void qc.invalidateQueries({ queryKey: ['watching-timeline'] })
                void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
                void qc.invalidateQueries({ queryKey: ['changes-watching'] })
              })
              .catch(() => undefined)
          },
        })
      }
    },
    onError: (err, _watched, ctx) => {
      if (ctx?.prev) qc.setQueryData(['change', changeId], ctx.prev)
      if (ctx?.prevHome) qc.setQueryData(['intelligence-home'], ctx.prevHome)
      if (ctx?.prevTimeline) qc.setQueryData(['watching-timeline'], ctx.prevTimeline)
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['change', changeId] })
      void qc.invalidateQueries({ queryKey: ['watching-timeline'] })
      void qc.invalidateQueries({ queryKey: ['changes-watching'] })
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
    },
  })

  const dismissMut = useMutation({
    mutationFn: () => api.dismissChange(changeId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['intelligence-home'] })
      const prevHome = qc.getQueryData<IntelligenceHome>(['intelligence-home'])
      qc.setQueryData<IntelligenceHome>(['intelligence-home'], (old) =>
        stripHomeMajor(old, changeId),
      )
      return { prevHome }
    },
    onSuccess: () => {
      pushToast('success', t('today.dismissed'), {
        label: t('common.undo'),
        onClick: () => {
          void api
            .undismissChange(changeId)
            .then(() => {
              void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
              void qc.invalidateQueries({ queryKey: ['changes-list'] })
            })
            .catch(() => undefined)
        },
      })
      // After dismiss, return to triage surface (Today) — same as deck swipe-left.
      navigate('/', { replace: false })
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prevHome) qc.setQueryData(['intelligence-home'], ctx.prevHome)
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      void qc.invalidateQueries({ queryKey: ['changes-list'] })
    },
  })

  const recomputeMut = useMutation({
    mutationFn: () => api.recomputeChangeImpact(changeId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['change', changeId] }),
        qc.invalidateQueries({ queryKey: ['changes'] }),
        qc.invalidateQueries({ queryKey: ['intelligence-home'] }),
      ])
      pushToast('success', t('changes.recomputeImpactDone'))
    },
    onError: (err) => {
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
    },
  })

  const visibleItems = useMemo(
    () => (q.data?.items ?? []).filter((item) => itemMatchesDisplay(item, displaySourceIds)),
    [q.data, displaySourceIds],
  )

  if (q.isLoading) return <ListSkeleton rows={5} />
  const missing =
    !q.data &&
    (q.isError
      ? q.error instanceof ApiError && q.error.status === 404
      : !q.isFetching)
  if (missing) {
    return (
      <EmptyState
        title={t('common.notFound')}
        primary={
          <button
            type="button"
            onClick={goBack}
            className={cn(
              'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
              focusRingClass(),
            )}
          >
            {t('common.backToList')}
          </button>
        }
      />
    )
  }
  if (q.isError) {
    return (
      <QueryErrorState
        message={t('common.loadFailed', { message: errorText(q.error, t) })}
        onRetry={() => void q.refetch()}
      />
    )
  }
  if (!q.data) {
    return <ListSkeleton rows={5} />
  }

  const c = q.data
  if (!changeMatchesDisplay(c, displaySourceIds)) {
    return (
      <EmptyState
        title={t('sources.hiddenByDisplayFilter')}
        primary={
          <Button
            onClick={() => {
              if (c.sourceIds?.length) {
                setDisplayedIds([
                  ...new Set([...(displaySourceIds ?? []), ...c.sourceIds]),
                ])
              } else {
                setAllDisplayed()
              }
            }}
            aria-label={
              c.sourceIds?.length
                ? t('sources.displayIncludeChange')
                : t('sources.displayRestoreAll')
            }
          >
            {c.sourceIds?.length
              ? t('sources.displayIncludeChange')
              : t('sources.displayRestoreAll')}
          </Button>
        }
        secondary={
          <button
            type="button"
            onClick={goBack}
            className={cn(
              'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
              focusRingClass(),
            )}
          >
            {t('common.backToList')}
          </button>
        }
      />
    )
  }

  const readerItem = visibleItems.find((i) => i.id === readerItemId)

  return (
    <div
      aria-busy={
        q.isFetching ||
        decisionMut.isPending ||
        recomputeMut.isPending ||
        watchMut.isPending ||
        dismissMut.isPending ||
        undefined
      }
    >
      <PageHeader
        titleId="change-detail-heading"
        title={c.title}
        subtitle={t('changes.detailSubtitle', {
          type: t(`changes.type.${c.changeType ?? 'unknown'}`, { defaultValue: c.changeType ?? 'unknown' }),
          score: c.score ?? '—',
        })}
        back={{ label: t('common.backToList'), onClick: goBack }}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={c.watched ? 'ghost' : 'primary'}
              loading={watchMut.isPending}
              disabled={watchMut.isPending || dismissMut.isPending}
              aria-pressed={Boolean(c.watched)}
              onClick={() => watchMut.mutate(!c.watched)}
              aria-label={c.watched ? t('today.unfollow') : t('today.watch')}
            >
              {c.watched ? t('today.unfollow') : t('today.watch')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={dismissMut.isPending}
              disabled={dismissMut.isPending || watchMut.isPending}
              onClick={() => dismissMut.mutate()}
              aria-label={t('today.dismiss')}
            >
              {t('today.dismiss')}
            </Button>
            {!showDecision ? (
              <Button
                size="sm"
                onClick={() => {
                  setShowDecision(true)
                  window.requestAnimationFrame(() => {
                    document.getElementById('change-decision')?.scrollIntoView({
                      block: 'start',
                      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                    })
                  })
                }}
                aria-label={
                  c.latestDecision ? t('decisions.updateCta') : t('decisions.record')
                }
              >
                {c.latestDecision ? t('decisions.updateCta') : t('decisions.record')}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              loading={recomputeMut.isPending}
              disabled={recomputeMut.isPending}
              onClick={() => recomputeMut.mutate()}
              aria-label={t('changes.recomputeImpact')}
              title={staleImpact ? t('changes.recomputeImpactHint') : undefined}
            >
              {t('changes.recomputeImpact')}
            </Button>
            <Link
              to={`/chat?changeId=${c.id}`}
              aria-label={t('chat.askAbout')}
              className={cn(
                'inline-flex min-h-9 items-center rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-accent hover:bg-accent-soft',
                focusRingClass(),
              )}
            >
              {t('chat.askAbout')}
            </Link>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label={t('changes.metaLabel')}>
        {c.tier ? <StatusBadge status={c.tier} /> : null}
        {c.status ? <StatusBadge status={c.status} /> : null}
        {c.firstDetectedAt ? (
          <span className="text-xs text-muted">
            {t('changes.firstDetected')}: {new Date(c.firstDetectedAt).toLocaleDateString(locale)}
          </span>
        ) : null}
        {c.lastUpdatedAt ? (
          <span className="text-xs text-muted">
            {t('changes.lastUpdated')}: {new Date(c.lastUpdatedAt).toLocaleDateString(locale)}
          </span>
        ) : null}
      </div>

      <section
        id="change-decision"
        className="mb-6 scroll-mt-24 rounded-xl border border-accent/25 bg-accent-soft/40 p-4"
        aria-labelledby="change-decision-heading"
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 id="change-decision-heading" className="font-serif text-lg text-ink">
            {c.latestDecision ? t('decisions.currentTitle') : t('decisions.record')}
          </h2>
          {!showDecision ? (
            <Button size="sm" variant="ghost" onClick={() => setShowDecision(true)}>
              {c.latestDecision ? t('decisions.updateCta') : t('decisions.recordCta')}
            </Button>
          ) : null}
        </div>
        {c.latestDecision && !showDecision ? (
          <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-md bg-surface px-1.5 py-0.5 text-xs font-medium text-ink">
                  {decisionKindLabel(c.latestDecision.kind, t)}
                </span>
                {c.latestDecision.reason ? (
                  <span className="text-muted">{c.latestDecision.reason}</span>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {c.latestDecision.revisitAt ? (
                <span className="text-xs tabular-nums text-moss">
                  {decisionRevisitLabel(c.latestDecision.revisitAt, locale, t)}
                </span>
              ) : null}
              {c.latestDecision.revisitAt &&
              (revisitDayDelta(c.latestDecision.revisitAt) ?? 1) <= 0 ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={snoozeMut.isPending}
                  onClick={() => snoozeMut.mutate(c.latestDecision!.id)}
                  aria-label={t('decisions.snoozeAria', { title: c.title })}
                >
                  {t('decisions.snooze')}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="mb-3 text-sm text-muted">{t('decisions.recordHint')}</p>
        )}
        {showDecision ? (
          <DecisionForm
            key={c.latestDecision?.id ?? 'new-decision'}
            autoFocus={focusDecision || Boolean(c.latestDecision)}
            defaultKind={c.latestDecision?.kind}
            defaultReason={c.latestDecision?.reason}
            defaultRevisitAt={c.latestDecision?.revisitAt}
            loading={decisionMut.isPending}
            onCancel={() => setShowDecision(false)}
            onSubmit={(kind, reason, revisitAt) =>
              decisionMut.mutate({ kind, reason, revisitAt })
            }
          />
        ) : null}
      </section>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div
          className="rounded-xl border border-border bg-surface/70 p-4 md:col-span-2"
          role="region"
          aria-labelledby="change-summary-heading"
        >
          <h2 id="change-summary-heading" className="mb-2 font-serif text-lg">
            {t('changes.summary')}
          </h2>
          <p className="text-sm leading-relaxed text-muted">{c.summary || t('changes.noSummary')}</p>
          {staleImpact ? (
            <div
              className="mt-4 rounded-lg border border-accent/25 bg-accent-soft/50 px-3 py-2.5"
              role="status"
            >
              <p className="text-sm text-ink">{t('changes.recomputeImpactHint')}</p>
              <Button
                className="mt-2"
                size="sm"
                loading={recomputeMut.isPending}
                disabled={recomputeMut.isPending}
                onClick={() => recomputeMut.mutate()}
              >
                {t('changes.recomputeImpact')}
              </Button>
            </div>
          ) : null}
          {c.why ? (
            <p className="mt-4 text-sm text-ink">
              <span className="text-muted">{t('home.whyMatters')}: </span>
              {c.why}
            </p>
          ) : null}
          {c.evidence ? (
            <p className="mt-2 text-sm text-muted">
              <span className="text-ink">{t('home.evidence')}: </span>
              {c.evidence}
            </p>
          ) : null}
          {c.recommendation ? (
            <p className="mt-2 text-sm text-muted">
              <span className="text-ink">{t('home.recommendation')}: </span>
              {c.recommendation}
            </p>
          ) : null}
          <FeedbackBar targetType="change" targetId={c.id} invalidateKeys={[['change', changeId], ['changes']]} />
        </div>
        <div
          className="rounded-xl border border-border bg-surface/70 p-4"
          role="region"
          aria-labelledby="change-scores-heading"
        >
          <h2 id="change-scores-heading" className="mb-2 font-serif text-lg">
            {t('changes.scores')}
          </h2>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-muted">
            <div className="flex justify-between gap-2">
              <dt>{t('common.relevance')}</dt>
              <dd className="font-mono tabular-nums text-ink">{Math.round(c.relevance ?? 0)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{t('changes.impact')}</dt>
              <dd className="font-mono tabular-nums text-ink">{Math.round(c.impact ?? 0)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{t('changes.urgency')}</dt>
              <dd className="font-mono tabular-nums text-ink">{Math.round(c.urgency ?? 0)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>{t('changes.confidence')}</dt>
              <dd className="font-mono tabular-nums text-ink">
                {Math.round(c.analysisConfidence ?? c.confidence ?? 0)}
              </dd>
            </div>
          </dl>
          <h2 className="mb-2 mt-4 font-serif text-lg">{t('changes.watchNext')}</h2>
          <p className="text-sm text-muted">{c.watchNext || '—'}</p>
        </div>
      </div>

      <section className="mb-8" aria-labelledby="change-timeline-heading">
        <h2 id="change-timeline-heading" className="mb-3 font-serif text-xl">
          {t('changes.timeline')}
        </h2>
        {!c.timeline?.length ? (
          <EmptyState title={t('changes.noTimeline')} description={t('changes.noTimelineHint')} />
        ) : (
          <ol className="space-y-3 border-l-2 border-moss/30 pl-4">
            {c.timeline.map((node) => (
              <li key={node.id} className="relative">
                <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-moss" aria-hidden />
                <p className="font-mono text-xs text-muted">
                  {node.at ? new Date(node.at).toLocaleString(locale) : ''}
                </p>
                <p className="text-sm font-medium text-ink">{node.label}</p>
                {node.note ? <p className="text-sm text-muted">{node.note}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-labelledby="change-items-heading">
        <h2 id="change-items-heading" className="mb-3 font-serif text-xl">
          {t('changes.sourcesItems')}
        </h2>
        <div className="rounded-xl border border-border bg-surface/70 px-4">
          {visibleItems.length === 0 ? (
            <EmptyState
              title={
                (c.items?.length ?? 0) > 0
                  ? t('sources.noItemsInDisplayFilter')
                  : t('changes.noLinkedItems')
              }
              description={
                (c.items?.length ?? 0) > 0
                  ? t('sources.noItemsInDisplayFilterHint')
                  : undefined
              }
              primary={
                (c.items?.length ?? 0) > 0 ? (
                  <Button
                    onClick={() => {
                      if (c.sourceIds?.length) {
                        setDisplayedIds([
                          ...new Set([...(displaySourceIds ?? []), ...c.sourceIds]),
                        ])
                      } else {
                        setAllDisplayed()
                      }
                    }}
                    aria-label={t('sources.displayRestoreAll')}
                  >
                    {t('sources.displayRestoreAll')}
                  </Button>
                ) : undefined
              }
            />
          ) : null}
          {visibleItems.map((item) => {
            const zhihu = isZhihuSource(item.primarySourceType)
            return (
              <article key={item.id} className="flex gap-3 border-b border-border/80 py-3 last:border-0">
                <ScorePill score={item.score} />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => setReaderItemId(item.id)}
                    className={`inline-flex min-h-9 items-center text-left font-medium ${textLinkClass()}`}
                  >
                    {item.title}
                  </button>
                  {item.summary ? <p className="mt-1 text-sm text-muted">{item.summary}</p> : null}
                  <div className="mt-1 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setReaderItemId(item.id)}
                      className={cn('inline-flex min-h-9 items-center text-xs', textLinkClass())}
                    >
                      {t('feed.readInRadar')}
                    </button>
                    {!zhihu && item.canonicalUrl ? (
                      <a
                        href={item.canonicalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={cn('inline-flex min-h-9 items-center text-xs', textLinkClass())}
                      >
                        {t('feed.openOriginal')} ↗
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <ImmersiveDrawer
        open={readerItemId != null}
        onClose={() => setReaderItemId(null)}
        title={readerItem?.title}
        titleHref={readerItem?.canonicalUrl}
      >
        {readerItemId ? <ItemDetailBody itemId={readerItemId} lead={readerItem?.summary} /> : null}
      </ImmersiveDrawer>
    </div>
  )
}
