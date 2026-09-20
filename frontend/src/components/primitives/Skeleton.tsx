import { useTranslation } from 'react-i18next'

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <span className="sr-only">{t('common.loading')}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-lg border border-border bg-surface px-4 py-4" aria-hidden>
          <div className="skeleton h-3.5 w-1/3" />
          <div className="skeleton mt-2.5 h-3 w-5/6" />
          <div className="skeleton mt-2 h-3 w-2/5" />
        </div>
      ))}
    </div>
  )
}
