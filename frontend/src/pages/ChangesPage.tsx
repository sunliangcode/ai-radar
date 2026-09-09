import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { FeedbackBar } from '../components/FeedbackBar'
import { Button, EmptyState, PageHeader, ScorePill, StateBox, StatusBadge } from '../components/ui'
import { dateLocale } from '../i18n'

export default function ChangesPage() {
  const { t, i18n } = useTranslation()
  const changes = useQuery({ queryKey: ['changes'], queryFn: () => api.changes(50) })
  const locale = dateLocale(i18n.language)
  const isEmpty = !changes.isLoading && changes.data?.length === 0

  return (
    <div>
      <PageHeader title={t('changes.title')} subtitle={t('changes.subtitle')} />
      {changes.isLoading ? <StateBox>{t('changes.loading')}</StateBox> : null}
      {changes.isError ? (
        <StateBox>{t('common.loadFailed', { message: (changes.error as Error).message })}</StateBox>
      ) : null}
      {isEmpty ? (
        <EmptyState
          title={t('changes.empty')}
          description={t('changes.emptyHint')}
          primary={
            <Link to="/contexts">
              <Button>{t('changes.emptyCta')}</Button>
            </Link>
          }
        />
      ) : null}
      {!isEmpty ? (
        <ul className="divide-y divide-mist rounded-xl border border-mist bg-paper/70">
          {changes.data?.map((c) => (
            <li key={c.id} className="px-4 py-4">
              <div className="flex items-start gap-3">
                <ScorePill score={c.priority ? Math.min(100, Math.round(c.priority / 1000)) : c.score} />
                <div className="min-w-0 flex-1">
                  <Link to={`/changes/${c.id}`} className="font-medium text-ink hover:text-moss">
                    {c.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {c.tier ? <StatusBadge status={c.tier} /> : null}
                    {c.changeType ? (
                      <span className="font-mono">{t(`changes.type.${c.changeType}`, { defaultValue: c.changeType })}</span>
                    ) : null}
                    <span className="font-mono tabular-nums">
                      {t('common.itemsCount', { count: c.itemCount ?? c.sourceCount ?? 0 })}
                      {c.lastUpdatedAt ? ` · ${new Date(c.lastUpdatedAt).toLocaleString(locale)}` : ''}
                    </span>
                  </div>
                  {c.why ? <p className="mt-2 text-sm text-muted">{c.why}</p> : null}
                  {!c.why && c.summary ? <p className="mt-2 text-sm text-muted">{c.summary}</p> : null}
                  <FeedbackBar targetType="change" targetId={c.id} invalidateKeys={[['changes']]} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
