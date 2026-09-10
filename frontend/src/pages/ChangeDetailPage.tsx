import { useQuery } from '@tanstack/react-query'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { FeedbackBar } from '../components/FeedbackBar'
import { PageHeader, ScorePill, StateBox, StatusBadge } from '../components/ui'
import { dateLocale } from '../i18n'

type LocationState = { from?: string }

export default function ChangeDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const changeId = Number(id)
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

  if (q.isLoading) return <StateBox>{t('changes.loading')}</StateBox>
  if (q.isError) return <StateBox>{t('common.loadFailed', { message: (q.error as Error).message })}</StateBox>
  if (!q.data) return <StateBox>{t('common.notFound')}</StateBox>

  const c = q.data
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
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-mist bg-paper/70 p-4 md:col-span-2">
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
        <div className="rounded-xl border border-mist bg-paper/70 p-4">
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
      <div className="rounded-xl border border-mist bg-paper/70 px-4">
        {c.items?.map((item) => (
          <article key={item.id} className="flex gap-3 border-b border-mist/80 py-3 last:border-0">
            <ScorePill score={item.score} />
            <div>
              <a href={item.canonicalUrl} target="_blank" rel="noreferrer" className="font-medium hover:text-moss">
                {item.title}
              </a>
              {item.summary ? <p className="mt-1 text-sm text-muted">{item.summary}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
