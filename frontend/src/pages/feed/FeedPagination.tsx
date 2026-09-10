import { useTranslation } from 'react-i18next'
import { Button } from '../../components/ui'

/** Prev/next pagination bar, shown only when there is more than one page. */
export function FeedPagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number
  total: number
  pageSize: number
  onChange: (next: number) => void
}) {
  const { t } = useTranslation()
  const totalPages = Math.ceil(total / pageSize)
  if (total <= pageSize) return null

  return (
    <div className="mt-3 flex items-center justify-between">
      <span className="font-mono text-xs text-muted">
        {t('feed.pageInfo', { page, totalPages })}
      </span>
      <div className="flex gap-2">
        <Button variant="ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          {t('feed.prev')}
        </Button>
        <Button variant="ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          {t('feed.next')}
        </Button>
      </div>
    </div>
  )
}
