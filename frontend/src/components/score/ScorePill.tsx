/** Legacy score pill kept for SourceDetailPage / ChangeDetailPage. */
export function ScorePill({ score }: { score?: number }) {
  if (score == null) return <span className="font-mono text-xs text-muted tabular-nums">—</span>
  return (
    <span className="inline-flex min-w-10 items-center justify-center rounded-sm border border-border bg-surface px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums text-ink">
      {Math.round(score)}
    </span>
  )
}
