import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
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
  const { displaySourceIds } = useDisplaySources()
  const settings = useSettings()
  const q = useQuery({
    queryKey: ['change', changeId],
    queryFn: () => api.change(changeId),
    enabled: Number.isFinite(changeId),
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
    const reduce = prefersReducedMotion()
    window.requestAnimationFrame(() => {
      document.getElementById('change-decision')?.scrollIntoView({
        block: 'start',
        behavior: reduce ? 'auto' : 'smooth',
      })
    })
  }, [focusDecision, changeId])

  const decisionMut = useMutation({
    mutationFn: (body: { kind: DecisionKind; reason: string; revisitAt: string }) =>
      api.postChangeDecision(changeId, {
        kind: body.kind,
        reason: body.reason.trim() || undefined,
        revisitAt: body.revisitAt || undefined,
      }),
    onSuccess: async (_data, vars) => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['decisions'] }),
        qc.invalidateQueries({ queryKey: ['decisions-due'] }),
        qc.invalidateQueries({ queryKey: ['intelligence-home'] }),
        qc.invalidateQueries({ queryKey: ['change', changeId] }),
        vars.kind === 'watch'
          ? qc.invalidateQueries({ queryKey: ['watching'] })
          : Promise.resolve(),
      ])
      setShowDecision(false)
      pushToast('success', t(engagement.decisionToastKey()), {
        label: fromState === '/' ? t('decisions.browseToday') : t('decisions.viewList'),
        onClick: () => navigate(fromState === '/' ? '/' : '/decisions'),
      })
    },
    onError: (err) => {
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
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
  if (q.isError) {
    return (
      <QueryErrorState
        message={t('common.loadFailed', { message: errorText(q.error, t) })}
        onRetry={() => void q.refetch()}
      />
    )
  }
  if (!q.data) {
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

  const c = q.data
  if (!changeMatchesDisplay(c, displaySourceIds)) {
    return (
      <EmptyState
        title={t('sources.hiddenByDisplayFilter')}
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

  const readerItem = visibleItems.find((i) => i.id === readerItemId)

  return (
    <div aria-busy={q.isFetching || decisionMut.isPending || recomputeMut.isPending || undefined}>
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
            {c.latestDecision.revisitAt ? (
              <span className="shrink-0 text-xs tabular-nums text-moss">
                {decisionRevisitLabel(c.latestDecision.revisitAt, locale, t)}
              </span>
            ) : null}
          </div>
        ) : (
          <p className="mb-3 text-sm text-muted">{t('decisions.recordHint')}</p>
        )}
        {showDecision ? (
          <DecisionForm
            autoFocus={focusDecision || Boolean(c.latestDecision)}
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
            <EmptyState title={t('sources.noItemsInDisplayFilter')} />
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
