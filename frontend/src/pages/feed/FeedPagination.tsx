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
    <nav
      className="sticky bottom-0 z-10 mt-3 flex items-center justify-between bg-bg/95 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm motion-reduce:backdrop-blur-none supports-[backdrop-filter]:bg-bg/80 motion-reduce:supports-[backdrop-filter]:bg-bg"
      aria-label={t('feed.pagination')}
    >
      <span className="font-mono text-xs text-muted" aria-live="polite">
        {t('feed.pageInfo', { page, totalPages })}
      </span>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          disabled={page <= 1}
          aria-label={t('feed.prev')}
          onClick={() => onChange(page - 1)}
        >
          {t('feed.prev')}
        </Button>
        <Button
          variant="ghost"
          disabled={page >= totalPages}
          aria-label={t('feed.next')}
          onClick={() => onChange(page + 1)}
        >
          {t('feed.next')}
        </Button>
      </div>
    </nav>
  )
}
