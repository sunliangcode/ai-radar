import { useTranslation } from 'react-i18next'
import type { AiMonitorQueue } from '../../lib/api'
import { ProgressBar } from '../../components/ui'

export function MonitorQueueCard({ queue }: { queue: AiMonitorQueue }) {
  const { t } = useTranslation()
  const done = queue.itemsDone ?? 0
  const total = Math.max(1, queue.itemsTotal ?? 1)
  const pct = Math.min(100, (done / total) * 100)

  return (
    <section
      className="mb-4 rounded-xl border border-border bg-surface/70 px-4 py-3"
      aria-labelledby="monitor-queue-heading"
      aria-busy={(queue.itemsRemaining ?? 0) > 0 || undefined}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p id="monitor-queue-heading" className="text-sm font-medium text-ink">
            {t('settings.monitorQueue')}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {t('settings.monitorQueueDetail', {
              done: queue.itemsDone ?? 0,
              total: queue.itemsTotal ?? 0,
              remaining: queue.itemsRemaining ?? 0,
            })}
          </p>
        </div>
        <p className="font-mono text-lg tabular-nums text-ink" aria-live="polite">
          {queue.itemsDone ?? 0}/{queue.itemsTotal ?? 0}
        </p>
      </div>
      <ProgressBar
        className="mt-2"
        value={pct}
        label={t('settings.monitorQueue')}
      />
      {queue.currentItemTitle ? (
        <p className="mt-2 truncate text-xs text-muted">
          {t('settings.monitorCurrentItem', { title: queue.currentItemTitle })}
        </p>
      ) : null}
    </section>
  )
}
