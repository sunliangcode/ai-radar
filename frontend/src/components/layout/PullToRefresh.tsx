import { useCallback, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { prefersReducedMotion } from '../../lib/a11y'
import { cn } from '../../lib/cn'

const THRESHOLD = 64

/**
 * Lightweight pull-to-refresh for mobile. Does not fight vertical scroll when
 * the page is already scrolled down.
 */
export function PullToRefresh({
  onRefresh,
  disabled,
  children,
}: {
  onRefresh: () => void | Promise<void>
  disabled?: boolean
  children: ReactNode
}) {
  const { t } = useTranslation()
  const startY = useRef<number | null>(null)
  const pullRef = useRef(0)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const reset = () => {
    startY.current = null
    pullRef.current = 0
    setPull(0)
  }

  const onTouchStart = (e: TouchEvent) => {
    if (disabled || refreshing || prefersReducedMotion()) return
    if (window.scrollY > 4) return
    startY.current = e.touches[0]?.clientY ?? null
  }

  const onTouchMove = (e: TouchEvent) => {
    if (startY.current == null) return
    const y = e.touches[0]?.clientY ?? startY.current
    const dy = Math.max(0, y - startY.current)
    if (dy > 8 && window.scrollY <= 0) {
      const next = Math.min(100, dy * 0.45)
      pullRef.current = next
      setPull(next)
    }
  }

  const onTouchEnd = useCallback(async () => {
    if (startY.current == null) return
    // Use ref — React `pull` state can be stale on touchend vs last touchmove.
    const shouldRefresh = pullRef.current >= THRESHOLD && !disabled && !refreshing
    reset()
    if (!shouldRefresh) return
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }, [disabled, refreshing, onRefresh])

  const ready = pull >= THRESHOLD
  const hint =
    refreshing || ready ? t('common.refreshing') : pull > 12 ? t('common.pullToRefresh') : null

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={() => void onTouchEnd()}
      onTouchCancel={reset}
    >
      <div
        className={cn(
          'pointer-events-none flex h-0 flex-col items-center justify-end overflow-visible text-xs text-muted transition-[height] motion-reduce:transition-none',
          (pull > 0 || refreshing) && 'mb-2',
        )}
        style={{ height: refreshing ? 32 : pull > 0 ? Math.max(pull * 0.4, 0) : 0 }}
        aria-live="polite"
        aria-busy={refreshing || undefined}
      >
        {hint ? (
          <>
            <span
              className={cn(
                'mb-1 h-1 w-8 rounded-full bg-border transition-colors motion-reduce:transition-none',
                (ready || refreshing) && 'bg-accent',
              )}
              aria-hidden
            />
            <span className={cn(refreshing && 'animate-pulse')}>{hint}</span>
          </>
        ) : null}
      </div>
      {children}
    </div>
  )
}
