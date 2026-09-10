import { useTranslation } from 'react-i18next'
import type { AiMonitorQueue } from '../../lib/api'

export function MonitorQueueCard({ queue }: { queue: AiMonitorQueue }) {
  const { t } = useTranslation()
  return (
    <section className="mb-4 rounded-xl border border-border bg-surface/70 px-4 py-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{t('settings.monitorQueue')}</p>
          <p className="mt-0.5 text-xs text-muted">
            {t('settings.monitorQueueDetail', {
              done: queue.itemsDone ?? 0,
              total: queue.itemsTotal ?? 0,
              remaining: queue.itemsRemaining ?? 0,
            })}
          </p>
        </div>
        <p className="font-mono text-lg tabular-nums text-ink">
          {queue.itemsDone ?? 0}/{queue.itemsTotal ?? 0}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-moss transition-[width] duration-300"
          style={{
            width: `${Math.max(
              8,
              Math.min(
                100,
                ((queue.itemsDone ?? 0) / Math.max(1, queue.itemsTotal ?? 1)) * 100,
              ),
            )}%`,
          }}
        />
      </div>
      {queue.currentItemTitle ? (
        <p className="mt-2 truncate text-xs text-muted">
          {t('settings.monitorCurrentItem', { title: queue.currentItemTitle })}
        </p>
      ) : null}
    </section>
  )
}
