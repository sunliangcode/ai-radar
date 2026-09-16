import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { FeedbackBar } from '../components/feedback/FeedbackBar'
import {
  ImmersiveDrawer,
  ItemDetailBody,
  PageHeader,
  ScorePill,
  StateBox,
  StatusBadge,
  isZhihuSource,
} from '../components/ui'
import { useDisplaySources } from '../hooks/useDisplaySources'
import { changeMatchesDisplay, itemMatchesDisplay } from '../lib/sourceFilter'
import { dateLocale } from '../i18n'
import { errorText } from '../lib/errors'

type LocationState = { from?: string }

export default function ChangeDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const changeId = Number(id)
  const [readerItemId, setReaderItemId] = useState<number | null>(null)
  const { displaySourceIds } = useDisplaySources()
  const q = useQuery({
    queryKey: ['change', changeId],
    queryFn: () => api.change(changeId),
    enabled: Number.isFinite(changeId),
  })
  const locale = dateLocale(i18n.language)

  const fromState = (location.state as LocationState | null)?.from
  const fallbackFrom = fromState ?? '/watching'
  const canGoBack = Boolean(fromState) && window.history.length > 1

  const goBack = () => {
    if (canGoBack) {
      navigate(-1)
      return
    }
    navigate(fallbackFrom, { replace: !fromState })
  }

  const visibleItems = useMemo(
    () => (q.data?.items ?? []).filter((item) => itemMatchesDisplay(item, displaySourceIds)),
    [q.data, displaySourceIds],
  )

  if (q.isLoading) return <StateBox>{t('changes.loading')}</StateBox>
  if (q.isError) return <StateBox>{t('common.loadFailed', { message: errorText(q.error, t) })}</StateBox>
  if (!q.data) return <StateBox>{t('common.notFound')}</StateBox>

  const c = q.data
  if (!changeMatchesDisplay(c, displaySourceIds)) {
    return (
      <StateBox>
        <p>{t('sources.hiddenByDisplayFilter')}</p>
        <button type="button" onClick={goBack} className="mt-3 text-sm text-accent hover:underline">
          {t('common.backToList')}
        </button>
      </StateBox>
    )
  }

  const readerItem = visibleItems.find((i) => i.id === readerItemId)

  return (
    <div>
      <PageHeader
        title={c.title}
        subtitle={t('changes.detailSubtitle', {
          type: t(`changes.type.${c.changeType ?? 'unknown'}`, { defaultValue: c.changeType ?? 'unknown' }),
          score: c.score ?? '—',
        })}
        actions={
          <button
            type="button"
            onClick={goBack}
            className="text-sm text-moss underline underline-offset-2"
          >
            {t('common.backToList')}
          </button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        {c.tier ? <StatusBadge status={c.tier} /> : null}
        {c.status ? <StatusBadge status={c.status} /> : null}
        <Link
          to={`/chat?changeId=${c.id}`}
          className="rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-accent hover:bg-accent-soft"
        >
          {t('chat.askAbout')}
        </Link>
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

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface/70 p-4 md:col-span-2">
          <h3 className="mb-2 font-serif text-lg">{t('changes.summary')}</h3>
          <p className="text-sm leading-relaxed text-muted">{c.summary || t('changes.noSummary')}</p>
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
        <div className="rounded-xl border border-border bg-surface/70 p-4">
          <h3 className="mb-2 font-serif text-lg">{t('changes.scores')}</h3>
          <p className="text-sm text-muted">
            R{Math.round(c.relevance ?? 0)} · I{Math.round(c.impact ?? 0)} · U{Math.round(c.urgency ?? 0)} · C
            {Math.round(c.analysisConfidence ?? c.confidence ?? 0)}
          </p>
          <h3 className="mb-2 mt-4 font-serif text-lg">{t('changes.watchNext')}</h3>
          <p className="text-sm text-muted">{c.watchNext || '—'}</p>
        </div>
      </div>

      <h3 className="mb-3 font-serif text-xl">{t('changes.timeline')}</h3>
      {!c.timeline?.length ? <StateBox>{t('changes.noTimeline')}</StateBox> : null}
      <ol className="mb-8 space-y-3 border-l-2 border-moss/30 pl-4">
        {c.timeline?.map((node) => (
          <li key={node.id} className="relative">
            <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-moss" />
            <p className="font-mono text-xs text-muted">
              {node.at ? new Date(node.at).toLocaleString(locale) : ''}
            </p>
            <p className="text-sm font-medium text-ink">{node.label}</p>
            {node.note ? <p className="text-sm text-muted">{node.note}</p> : null}
          </li>
        ))}
      </ol>

      <h3 className="mb-3 font-serif text-xl">{t('changes.sourcesItems')}</h3>
      <div className="rounded-xl border border-border bg-surface/70 px-4">
        {visibleItems.length === 0 ? (
          <p className="py-4 text-sm text-muted">{t('sources.noItemsInDisplayFilter')}</p>
        ) : null}
        {visibleItems.map((item) => {
          const zhihu = isZhihuSource(item.primarySourceType)
          return (
            <article key={item.id} className="flex gap-3 border-b border-border/80 py-3 last:border-0">
              <ScorePill score={item.score} />
              <div className="min-w-0 flex-1">
                {zhihu ? (
                  <button
                    type="button"
                    onClick={() => setReaderItemId(item.id)}
                    className="text-left font-medium text-accent hover:underline"
                  >
                    {item.title}
                  </button>
                ) : (
                  <a href={item.canonicalUrl} target="_blank" rel="noreferrer" className="font-medium hover:text-moss">
                    {item.title}
                  </a>
                )}
                {item.summary ? <p className="mt-1 text-sm text-muted">{item.summary}</p> : null}
                {zhihu ? (
                  <button
                    type="button"
                    onClick={() => setReaderItemId(item.id)}
                    className="mt-1 text-xs text-accent hover:underline"
                  >
                    {t('feed.readInRadar')}
                  </button>
                ) : null}
              </div>
            </article>
          )
        })}
      </div>

      <ImmersiveDrawer
        open={readerItemId != null}
        onClose={() => setReaderItemId(null)}
        title={readerItem?.title}
      >
        {readerItemId ? <ItemDetailBody itemId={readerItemId} lead={readerItem?.summary} /> : null}
      </ImmersiveDrawer>
    </div>
  )
}
