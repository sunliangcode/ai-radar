import { useCallback, useEffect, useRef, useState, type TouchEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Search, SkipForward, X } from 'lucide-react'
import type { ImpactCard } from '../../lib/api'
import { Button, HeroFocusCard } from '../ui'
import { InboxZeroBurst } from '../engagement/InboxZeroBurst'
import { isAriaModalOpen, isEditableTarget, prefersReducedMotion } from '../../lib/a11y'
import { cn, focusRingClass } from '../../lib/cn'

const SWIPE_TRIGGER = 72
const SWIPE_MAX = 140

export function RadarDeck({
  cards,
  busy,
  onWatch,
  onDismiss,
  onDecide,
  onInvestigate,
  onCleared,
}: {
  cards: ImpactCard[]
  busy?: boolean
  onWatch: (card: ImpactCard) => void
  onDismiss: (card: ImpactCard) => void
  onDecide: (card: ImpactCard) => void
  onInvestigate: (card: ImpactCard) => void
  /** Fired once when the deck first empties after having cards. */
  onCleared?: () => void
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [index, setIndex] = useState(0)
  const [hintsOpen, setHintsOpen] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [everHad, setEverHad] = useState(false)
  const [baseline, setBaseline] = useState(0)
  const [clearedFired, setClearedFired] = useState(false)
  const [dx, setDx] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const startX = useRef<number | null>(null)
  const startY = useRef<number | null>(null)
  const axis = useRef<'h' | 'v' | null>(null)

  useEffect(() => {
    if (cards.length > 0) {
      setEverHad(true)
      setBaseline((b) => Math.max(b, cards.length))
    }
  }, [cards.length])

  const safeIndex = cards.length === 0 ? 0 : Math.min(index, cards.length - 1)
  const card = cards[safeIndex]
  const done = Math.max(0, baseline - cards.length)
  const total = Math.max(baseline, cards.length)
  const timeline = (card?.recentTimeline ?? []).slice(0, 2)

  useEffect(() => {
    if (cards.length === 0 && everHad && !clearedFired) {
      setClearedFired(true)
      onCleared?.()
    }
  }, [cards.length, everHad, clearedFired, onCleared])

  const runExit = useCallback((action: () => void) => {
    if (prefersReducedMotion()) {
      action()
      return
    }
    setExiting(true)
    window.setTimeout(() => {
      action()
      setExiting(false)
    }, 180)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (isAriaModalOpen()) return
      if (busy || cards.length === 0 || !card) return

      if (e.key === '?') {
        e.preventDefault()
        setHintsOpen((v) => !v)
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'h') {
        e.preventDefault()
        setIndex((i) => Math.max(0, i - 1))
      } else if (e.key === 'ArrowRight' || e.key === 'l') {
        e.preventDefault()
        setIndex((i) => Math.min(cards.length - 1, i + 1))
      } else if (e.key === 'w' || e.key === 'W') {
        e.preventDefault()
        runExit(() => onWatch(card))
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault()
        runExit(() => onDismiss(card))
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault()
        onInvestigate(card)
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault()
        onDecide(card)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, cards, card, onWatch, onDismiss, onDecide, onInvestigate, runExit])

  if (cards.length === 0) {
    if (!everHad) return null
    return (
      <InboxZeroBurst title={t('today.deckClearTitle')} subtitle={t('today.deckClearSubtitle')}>
        <Link
          to="/radar"
          aria-label={t('today.exploreLink')}
          className={cn(
            'inline-flex min-h-10 items-center rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90',
            focusRingClass(),
          )}
        >
          {t('today.exploreLink')}
        </Link>
        <Link
          to="/briefs"
          aria-label={t('nav.briefs')}
          className={cn(
            'inline-flex min-h-10 items-center rounded-md border border-border px-3 py-2 text-sm text-accent hover:border-accent/50',
            focusRingClass(),
          )}
        >
          {t('nav.briefs')}
        </Link>
      </InboxZeroBurst>
    )
  }

  if (!card) return null

  const changeId = card.eventId ?? card.changeId
  const watchHint = dx > 28
  const dismissHint = dx < -28

  const onTouchStart = (e: TouchEvent) => {
    if (busy || prefersReducedMotion()) return
    const touch = e.touches[0]
    if (!touch) return
    startX.current = touch.clientX
    startY.current = touch.clientY
    axis.current = null
    setSwiping(true)
  }

  const onTouchMove = (e: TouchEvent) => {
    if (startX.current == null || startY.current == null) return
    const touch = e.touches[0]
    if (!touch) return
    const rawX = touch.clientX - startX.current
    const rawY = touch.clientY - startY.current
    if (axis.current == null) {
      if (Math.abs(rawX) < 10 && Math.abs(rawY) < 10) return
      axis.current = Math.abs(rawX) > Math.abs(rawY) ? 'h' : 'v'
      if (axis.current === 'v') {
        startX.current = null
        setDx(0)
        setSwiping(false)
        return
      }
    }
    if (axis.current !== 'h') return
    e.preventDefault()
    setDx(Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, rawX)))
  }

  const finishSwipe = () => {
    if (Math.abs(dx) >= SWIPE_TRIGGER && !busy) {
      if (dx > 0) runExit(() => onWatch(card))
      else runExit(() => onDismiss(card))
    }
    startX.current = null
    startY.current = null
    axis.current = null
    setDx(0)
    setSwiping(false)
  }

  return (
    <section
      className="mb-8"
      aria-labelledby="today-deck-progress"
      aria-busy={busy || undefined}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2
            id="today-deck-progress"
            className="font-mono text-xs uppercase tracking-widest text-muted"
            aria-live="polite"
            aria-atomic="true"
          >
            {t('today.deckProgress', { done, total })}
          </h2>
          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {t('today.deckCardAnnounce', {
              current: safeIndex + 1,
              total: cards.length,
              title: card.title,
            })}
          </p>
          <div
            className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuetext={`${done} / ${total}`}
            aria-label={t('today.deckProgress', { done, total })}
          >
            <div
              className="h-full rounded-full bg-moss transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          className={cn(
            'inline-flex min-h-9 items-center rounded-sm px-2 text-xs text-muted hover:text-ink',
            focusRingClass(),
          )}
          aria-expanded={hintsOpen}
          aria-controls="today-deck-hints"
          onClick={() => setHintsOpen((v) => !v)}
        >
          {hintsOpen ? t('today.deckHintsHide') : t('today.deckHintsShow')}
        </button>
      </div>

      {hintsOpen ? (
        <p
          id="today-deck-hints"
          role="region"
          aria-label={t('today.deckHintsShow')}
          className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted"
        >
          <span>
            <kbd aria-hidden>←</kbd>/<kbd aria-hidden>→</kbd> {t('today.keyNav')}
          </span>
          <span>
            <kbd aria-hidden>w</kbd> {t('today.watch')}
          </span>
          <span>
            <kbd aria-hidden>x</kbd> {t('today.dismiss')}
          </span>
          <span>
            <kbd aria-hidden>i</kbd> {t('today.investigate')}
          </span>
          <span>
            <kbd aria-hidden>d</kbd> {t('today.decide')}
          </span>
          <span>{t('today.deckSwipeHint')}</span>
        </p>
      ) : null}

      {cards.length > 1 ? (
        <div
          className="mb-3 flex gap-2 overflow-x-auto pb-1 thin-scroll"
          role="group"
          aria-label={t('today.deckCardPicker')}
        >
          {cards.map((c, i) => (
            <button
              key={c.id ?? c.eventId}
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={i === safeIndex}
              aria-label={c.title}
              className={cn(
                'max-w-[10rem] min-h-9 shrink-0 truncate rounded-md border px-2.5 py-1.5 text-left text-xs transition motion-reduce:transition-none',
                focusRingClass(),
                i === safeIndex
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border text-muted hover:border-accent/40 hover:text-ink',
              )}
              title={c.title}
            >
              {c.title}
            </button>
          ))}
        </div>
      ) : null}

      <div
        className={cn(
          'relative touch-pan-y',
          exiting ? 'deck-slide-out' : 'deck-slide-in',
          swiping && 'mag-card--swiping',
        )}
        style={
          dx
            ? { transform: `translateX(${dx}px) rotate(${dx * 0.03}deg)`, transition: 'none' }
            : undefined
        }
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={finishSwipe}
        onTouchCancel={finishSwipe}
      >
        {watchHint || dismissHint ? (
          <div
            className={cn(
              'pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center',
            )}
            aria-hidden
          >
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium text-white shadow',
                watchHint ? 'bg-moss' : 'bg-ember',
              )}
            >
              {watchHint ? t('today.watch') : t('today.dismiss')}
            </span>
          </div>
        ) : null}
        <HeroFocusCard
          title={card.title}
          why={card.why}
          evidence={card.recommendation}
          score={card.score}
          tier={card.tier}
          onOpen={changeId ? () => navigate(`/changes/${changeId}`, { state: { from: '/' } }) : undefined}
          actions={
            changeId ? (
              <Link
                to={`/changes/${changeId}`}
                state={{ from: '/' }}
                aria-label={`${t('today.openChange')}: ${card.title}`}
                className={cn(
                  'inline-flex min-h-9 items-center rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90',
                  focusRingClass(),
                )}
              >
                {t('today.openChange')} →
              </Link>
            ) : null
          }
        />

        {timeline.length > 0 || card.changeSummary ? (
          <div className="mb-4 -mt-2 rounded-xl border border-border bg-surface/80 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              {t('today.whatChanged')}
            </p>
            {card.changeSummary ? (
              <p className="mt-1 text-sm text-muted">{card.changeSummary}</p>
            ) : null}
            {timeline.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-ink">
                {timeline.map((node, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-faint">·</span>
                    <span>
                      {node.label}
                      {node.note ? ` — ${node.note}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={card.title}
          aria-busy={busy || undefined}
        >
          <Button
            size="sm"
            onClick={() => runExit(() => onWatch(card))}
            disabled={busy}
            className="gap-1.5"
            aria-label={`${t('today.watch')}: ${card.title}`}
            title={`${t('today.watch')} (w)`}
          >
            <Eye size={14} aria-hidden />
            {t('today.watch')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => runExit(() => onDismiss(card))}
            disabled={busy}
            className="gap-1.5"
            aria-label={`${t('today.dismiss')}: ${card.title}`}
            title={`${t('today.dismiss')} (x)`}
          >
            <X size={14} aria-hidden />
            {t('today.dismiss')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onInvestigate(card)}
            disabled={busy}
            className="gap-1.5"
            aria-label={`${t('today.investigate')}: ${card.title}`}
            title={`${t('today.investigate')} (i)`}
          >
            <Search size={14} aria-hidden />
            {t('today.investigate')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDecide(card)}
            disabled={busy}
            className="gap-1.5"
            aria-label={`${t('today.decide')}: ${card.title}`}
            title={`${t('today.decide')} (d)`}
          >
            <SkipForward size={14} aria-hidden />
            {t('today.decide')}
          </Button>
        </div>
      </div>
    </section>
  )
}
