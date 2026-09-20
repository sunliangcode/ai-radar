import { useTranslation } from 'react-i18next'

/** Legacy score pill kept for SourceDetailPage / ChangeDetailPage. */
export function ScorePill({ score }: { score?: number }) {
  const { t } = useTranslation()
  if (score == null) {
    return (
      <span
        className="font-mono text-xs text-muted tabular-nums"
        aria-label={`${t('common.relevance')}: —`}
      >
        —
      </span>
    )
  }
  const value = Math.round(score)
  return (
    <span
      className="inline-flex min-w-10 items-center justify-center rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums text-ink"
      aria-label={`${t('common.relevance')}: ${value}`}
    >
      {value}
    </span>
  )
}
