import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MonitorBubble } from './MonitorBubble'
import type { IoEntry } from './monitorUtils'

/**
 * Live in/out console: header controls (pause / stick-bottom), operation
 * filter chips and the scrolling bubble list.
 */
export function LiveConsole({
  ioEntries,
  inFlightCount,
  streamLen,
  operations,
  opFilter,
  onOpFilterChange,
  paused,
  onTogglePause,
}: {
  ioEntries: IoEntry[]
  inFlightCount: number
  streamLen: number
  operations: string[]
  opFilter: string
  onOpFilterChange: (op: string) => void
  paused: boolean
  onTogglePause: () => void
}) {
  const { t } = useTranslation()
  const [stickBottom, setStickBottom] = useState(true)
  const [rawKeys, setRawKeys] = useState<Record<string, boolean>>({})
  const consoleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!stickBottom || !consoleRef.current) return
    consoleRef.current.scrollTop = consoleRef.current.scrollHeight
  }, [ioEntries.length, inFlightCount, streamLen, stickBottom])

  function onConsoleScroll() {
    const el = consoleRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    setStickBottom(nearBottom)
  }

  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-border bg-gradient-to-b from-surface to-border/30">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div>
          <p className="text-xs font-medium tracking-wide text-ink">
            {t('settings.monitorLiveIo')}
          </p>
          <p className="text-[11px] text-muted">{t('settings.monitorLiveIoHint')}</p>
        </div>
        <div className="flex items-center gap-2">
          {inFlightCount > 0 ? (
            <span className="font-mono text-[11px] text-accent">
              {t('settings.monitorInFlight')} {inFlightCount}
            </span>
          ) : null}
          {paused ? (
            <span className="font-mono text-[11px] text-accent">{t('settings.monitorPaused')}</span>
          ) : null}
          <button
            type="button"
            className="rounded border border-border px-2 py-0.5 text-[11px] text-ink hover:border-accent/50 hover:text-accent"
            onClick={onTogglePause}
          >
            {paused ? t('settings.monitorResume') : t('settings.monitorPause')}
          </button>
          {!stickBottom ? (
            <button
              type="button"
              className="rounded border border-border px-2 py-0.5 text-[11px] text-ink hover:border-accent/50 hover:text-accent"
              onClick={() => {
                setStickBottom(true)
                if (consoleRef.current) {
                  consoleRef.current.scrollTop = consoleRef.current.scrollHeight
                }
              }}
            >
              {t('settings.monitorScrollBottom')}
            </button>
          ) : null}
        </div>
      </div>
      {operations.length > 1 ? (
        <div className="flex flex-wrap gap-1 border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => onOpFilterChange('')}
            className={`rounded px-2 py-0.5 text-[11px] ${
              !opFilter
                ? 'bg-moss text-surface'
                : 'border border-border text-muted hover:text-accent'
            }`}
          >
            {t('settings.monitorAllOps')}
          </button>
          {operations.map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => onOpFilterChange(op)}
              className={`rounded px-2 py-0.5 font-mono text-[11px] ${
                opFilter === op
                  ? 'bg-moss text-surface'
                  : 'border border-border text-muted hover:text-accent'
              }`}
            >
              {op}
            </button>
          ))}
        </div>
      ) : null}
      <div
        ref={consoleRef}
        onScroll={onConsoleScroll}
        className="thin-scroll max-h-[min(52vh,28rem)] min-h-[12rem] overflow-y-auto px-3 py-4"
      >
        {ioEntries.length === 0 ? (
          <p className="text-sm text-muted">{t('settings.monitorEmpty')}</p>
        ) : (
          ioEntries.map((entry) => (
            <MonitorBubble
              key={entry.key}
              entry={entry}
              showRaw={Boolean(rawKeys[entry.key])}
              onToggleRaw={() =>
                setRawKeys((prev) => ({ ...prev, [entry.key]: !prev[entry.key] }))
              }
            />
          ))
        )}
      </div>
    </section>
  )
}
