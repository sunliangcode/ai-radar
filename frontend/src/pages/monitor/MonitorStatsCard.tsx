import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AiMonitor, AiMonitorCall } from '../../lib/api'
import { formatClock, formatTps } from './monitorUtils'
import { HistoryBody } from './MonitorBubble'

/** TPS / context stats grid plus the expandable recent-calls table. */
export function MonitorStatsCard({
  mon,
  filteredRecent,
}: {
  mon: AiMonitor
  filteredRecent: AiMonitorCall[]
}) {
  const { t } = useTranslation()
  const [expandedCall, setExpandedCall] = useState<string | null>(null)

  const usedPct = Math.min(100, Math.max(0, mon.lastContextUsedPct ?? 0))
  const windowTokens = mon.lastContextWindow ?? mon.contextWindow ?? 4096

  return (
    <div className="rounded-xl border border-border bg-surface/70 p-4">
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border px-3 py-2">
          <p className="text-xs text-muted">{t('settings.monitorTps')}</p>
          <p className="mt-1 font-mono text-lg text-ink">
            {formatTps(mon.lastTokensPerSec)}
            <span className="ml-1 text-xs text-muted">tok/s</span>
          </p>
          <p className="text-xs text-muted">
            {t('settings.monitorAvgTps', { value: formatTps(mon.avgTokensPerSec) })}
          </p>
        </div>
        <div className="rounded-lg border border-border px-3 py-2 sm:col-span-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs text-muted">{t('settings.monitorContext')}</p>
            <p className="font-mono text-sm text-ink">
              {mon.lastContextUsed ?? 0} / {windowTokens}
              <span className="ml-1 text-xs text-muted">({usedPct.toFixed(0)}%)</span>
            </p>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(usedPct)}
            aria-label={t('settings.monitorContext')}
          >
            <div
              className={`h-full rounded-full transition-all ${
                usedPct >= 90 ? 'bg-ember' : usedPct >= 70 ? 'bg-accent' : 'bg-moss'
              }`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            {t('settings.monitorLatency', { ms: mon.lastLatencyMs ?? '—' })}
            {' · '}
            {t('settings.monitorCalls', { count: mon.callCount, errors: mon.errorCount })}
          </p>
        </div>
      </div>

      <h3 className="mb-2 text-sm font-medium text-ink">{t('settings.monitorHistory')}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] text-left text-xs">
          <thead className="text-muted">
            <tr className="border-b border-border">
              <th className="py-1.5 pr-2 font-medium">{t('settings.monitorColTime')}</th>
              <th className="py-1.5 pr-2 font-medium">{t('settings.monitorColOp')}</th>
              <th className="py-1.5 pr-2 font-medium">{t('settings.monitorColTokens')}</th>
              <th className="py-1.5 pr-2 font-medium">tok/s</th>
              <th className="py-1.5 pr-2 font-medium">{t('settings.monitorColStatus')}</th>
            </tr>
          </thead>
          <tbody>
            {(filteredRecent ?? []).slice(0, 30).map((row) => {
              const key = `${row.ts}-${row.operation}-${row.promptTokens}-${row.completionTokens}`
              const open = expandedCall === key
              const toggle = () => setExpandedCall(open ? null : key)
              return (
                <Fragment key={key}>
                  <tr
                    className="cursor-pointer border-b border-border/60 text-ink hover:bg-border/30"
                    tabIndex={0}
                    aria-expanded={open}
                    onClick={toggle}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        toggle()
                      }
                    }}
                  >
                    <td className="py-1.5 pr-2 font-mono text-[11px] text-muted">
                      {formatClock(row.ts)}
                    </td>
                    <td className="py-1.5 pr-2 font-mono">
                      {open ? '▾ ' : '▸ '}
                      {row.operation}
                    </td>
                    <td className="py-1.5 pr-2 font-mono">
                      {row.promptTokens}+{row.completionTokens}
                      {row.truncated ? (
                        <span className="ml-1 text-ember">{t('settings.monitorTruncated')}</span>
                      ) : null}
                    </td>
                    <td className="py-1.5 pr-2 font-mono">{formatTps(row.tokensPerSec)}</td>
                    <td className="py-1.5 pr-2">
                      {row.ok ? (
                        <span className="text-moss">{t('common.yes')}</span>
                      ) : (
                        <span className="text-ember" title={row.error ?? undefined}>
                          {t('common.no')}
                        </span>
                      )}
                    </td>
                  </tr>
                  {open ? (
                    <tr className="border-b border-border/60">
                      <td colSpan={5} className="bg-surface/80 px-2 py-2" onClick={(e) => e.stopPropagation()}>
                        <p className="mb-1 text-[11px] font-medium text-muted">
                          {t('settings.monitorInput')}
                        </p>
                        <div className="mb-3">
                          <HistoryBody
                            kind="input"
                            operation={row.operation}
                            body={row.promptPreview || '—'}
                          />
                        </div>
                        <p className="mb-1 text-[11px] font-medium text-muted">
                          {t('settings.monitorOutput')}
                        </p>
                        <HistoryBody
                          kind="output"
                          operation={row.operation}
                          body={row.responsePreview || row.error || '—'}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
