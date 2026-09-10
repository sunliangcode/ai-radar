import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { useTranslation } from 'react-i18next'
import { formatAiMonitorBody } from '../../lib/formatAiMonitorBody'
import { formatClock, type IoEntry } from './monitorUtils'

export function MonitorBubble({
  entry,
  showRaw,
  onToggleRaw,
}: {
  entry: IoEntry
  showRaw: boolean
  onToggleRaw: () => void
}) {
  const { t } = useTranslation()
  const isInput = entry.kind === 'input'
  // Input: show prompt raw (same as「查看原始」). Output: conversational format.
  const formatted = isInput
    ? null
    : formatAiMonitorBody(entry.body || (entry.pending ? '' : '—'), {
        kind: entry.kind,
        operation: entry.operation,
      })
  const rawText = entry.body || (entry.pending ? '' : '—')
  const displayText =
    entry.pending && !entry.body
      ? ''
      : isInput
        ? rawText
        : formatted?.text || (entry.pending ? '' : '—')

  return (
    <div
      className={`mb-4 flex ${isInput ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[min(92%,36rem)] ${
          isInput ? 'items-end' : 'items-start'
        } flex flex-col gap-1`}
      >
        <div className="flex flex-wrap items-baseline gap-2 px-1">
          <span
            className={
              isInput
                ? 'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-moss/25 text-moss'
                : entry.ok === false
                  ? 'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-ember/20 text-ember'
                  : 'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-accent/15 text-accent'
            }
          >
            {isInput ? t('settings.monitorYou') : t('settings.monitorAssistant')}
          </span>
          <span className="font-mono text-[11px] text-muted">{entry.operation}</span>
          <span className="text-[11px] text-muted/70">{formatClock(entry.at)}</span>
          {entry.pending ? (
            <span className="animate-pulse text-[11px] text-accent">
              {entry.streaming
                ? t('settings.monitorIoStreaming')
                : t('settings.monitorIoWaiting')}
            </span>
          ) : null}
        </div>
        <div
          className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
            isInput
              ? 'rounded-br-md bg-border/80 text-ink'
              : entry.ok === false
                ? 'rounded-bl-md border border-ember/30 bg-ember/5 text-ink'
                : 'rounded-bl-md border border-border bg-surface text-ink shadow-sm'
          }`}
        >
          {entry.pending && !entry.body ? (
            <span className="inline-flex items-center gap-1 text-muted" aria-label={t('settings.monitorIoWaiting')}>
              <span className="monitor-cursor" aria-hidden />
            </span>
          ) : isInput ? (
            <pre className="max-h-[min(40vh,20rem)] overflow-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-ink">
              {displayText}
            </pre>
          ) : (
            <div className="prose-monitor">
              <ReactMarkdown>{displayText}</ReactMarkdown>
              {entry.streaming ? <span className="monitor-cursor" aria-hidden /> : null}
            </div>
          )}
        </div>
        {!isInput && entry.body && entry.body !== '—' ? (
          <button
            type="button"
            className="px-1 text-[11px] text-muted underline-offset-2 hover:text-accent hover:underline"
            onClick={onToggleRaw}
          >
            {showRaw ? t('settings.monitorHideRaw') : t('settings.monitorShowRaw')}
          </button>
        ) : null}
        {!isInput && showRaw && entry.body ? (
          <pre className="max-h-40 w-full overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface/90 p-2 font-mono text-[11px] text-muted">
            {entry.body}
          </pre>
        ) : null}
      </div>
    </div>
  )
}

export function HistoryBody({
  kind,
  operation,
  body,
}: {
  kind: 'input' | 'output'
  operation: string
  body: string
}) {
  const { t } = useTranslation()
  const [showRaw, setShowRaw] = useState(false)
  const formatted = formatAiMonitorBody(body || '—', { kind, operation })
  return (
    <div>
      <div className="prose-monitor mb-1 max-h-48 overflow-auto rounded border border-border bg-surface/90 p-2 text-sm text-ink">
        <ReactMarkdown>{formatted.text}</ReactMarkdown>
      </div>
      {body && body !== '—' ? (
        <>
          <button
            type="button"
            className="mb-1 text-[11px] text-muted underline-offset-2 hover:text-accent hover:underline"
            onClick={() => setShowRaw((v) => !v)}
          >
            {showRaw ? t('settings.monitorHideRaw') : t('settings.monitorShowRaw')}
          </button>
          {showRaw ? (
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-border p-2 font-mono text-[11px] text-muted">
              {body}
            </pre>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
