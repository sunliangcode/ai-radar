import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { Button, EmptyState, ItemRow, PageHeader, StateBox } from '../components/ui'
import { dateLocale } from '../i18n'

export default function ItemsPage() {
  const { t, i18n } = useTranslation()
  const [sort, setSort] = useState<'score' | 'publishedAt'>('score')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const qc = useQueryClient()
  const q = `?sort=${sort}&limit=80${unreadOnly ? '&unread=true' : ''}`
  const items = useQuery({ queryKey: ['items', sort, unreadOnly], queryFn: () => api.items(q) })
  const locale = dateLocale(i18n.language)

  const patch = useMutation({
    mutationFn: ({ id, read }: { id: number; read: boolean }) => api.patchItem(id, { read }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  })
  const markAll = useMutation({
    mutationFn: api.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['items'] }),
  })

  return (
    <div>
      <PageHeader
        title={t('items.title')}
        subtitle={t('items.subtitle')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setSort(sort === 'score' ? 'publishedAt' : 'score')}>
              {sort === 'score' ? t('items.sortScore') : t('items.sortTime')}
            </Button>
            <Button variant="ghost" onClick={() => setUnreadOnly((v) => !v)}>
              {unreadOnly ? t('items.showAll') : t('items.unreadOnly')}
            </Button>
            <Button variant="ghost" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              {t('items.markAllRead')}
            </Button>
          </>
        }
      />

      {items.isLoading ? <StateBox>{t('items.loading')}</StateBox> : null}
      {items.isError ? (
        <StateBox>{t('common.loadFailed', { message: (items.error as Error).message })}</StateBox>
      ) : null}
      {!items.isLoading && items.data?.length === 0 ? (
        <EmptyState
          title={t('items.empty')}
          description={t('items.emptyLink')}
          primary={
            <Link to="/sources">
              <Button>{t('nav.sources')}</Button>
            </Link>
          }
          secondary={
            <Link to="/">
              <Button variant="ghost">{t('nav.today')}</Button>
            </Link>
          }
        />
      ) : null}

      {items.data && items.data.length > 0 ? (
      <div className="rounded-xl border border-mist bg-paper/70 px-4">
        {items.data.map((item) => (
          <ItemRow
            key={item.id}
            title={item.title}
            score={item.score}
            summary={item.summary}
            url={item.canonicalUrl}
            meta={[
              item.primarySourceType,
              item.publishedAt ? new Date(item.publishedAt).toLocaleString(locale) : '',
              item.eventId ? `${t('nav.events')} #${item.eventId}` : '',
            ]
              .filter(Boolean)
              .join(' · ')}
            unread={!item.read}
            onMarkRead={() => patch.mutate({ id: item.id, read: true })}
          />
        ))}
      </div>
      ) : null}
      {items.data?.some((i) => i.eventId) ? (
        <p className="mt-4 text-sm text-muted">
          {t('items.eventHint')}{' '}
          <Link className="text-moss underline" to="/events">
            {t('items.eventHintLink')}
          </Link>{' '}
          {t('items.eventHintSuffix')}
        </p>
      ) : null}
    </div>
  )
}
