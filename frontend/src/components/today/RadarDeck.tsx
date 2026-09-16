import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Eye, Search, SkipForward, X } from 'lucide-react'
import type { ImpactCard } from '../../lib/api'
import { Button, HeroFocusCard } from '../ui'
import { InboxZeroBurst } from '../engagement/InboxZeroBurst'
import { cn } from '../../lib/cn'

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
    setExiting(true)
    window.setTimeout(() => {
      action()
      setExiting(false)
    }, 180)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (cards.length === 0 || !card) return

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
        onWatch(card)
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
  }, [cards, card, onWatch, onDismiss, onDecide, onInvestigate, runExit])

  if (cards.length === 0) {
    if (!everHad) return null
    return (
      <InboxZeroBurst title={t('today.deckClearTitle')} subtitle={t('today.deckClearSubtitle')}>
        <Link
          to="/explore"
          className="inline-flex items-center rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          {t('today.exploreLink')}
        </Link>
        <Link
          to="/briefs"
          className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm text-accent hover:border-accent/50"
        >
          {t('nav.briefs')}
        </Link>
      </InboxZeroBurst>
    )
  }

  if (!card) return null

  const changeId = card.eventId ?? card.changeId

  return (
    <section className="mb-8" aria-label={t('today.majorChanges')}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
            {t('today.deckProgress', { done, total })}
          </h2>
          <div
            className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={total}
          >
            <div
              className="h-full rounded-full bg-moss transition-[width] duration-300"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          className="text-xs text-muted hover:text-ink"
          aria-expanded={hintsOpen}
          onClick={() => setHintsOpen((v) => !v)}
        >
          {hintsOpen ? t('today.deckHintsHide') : t('today.deckHintsShow')}
        </button>
      </div>

      {hintsOpen ? (
        <p className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
          <span>
            <kbd>←</kbd>/<kbd>→</kbd> {t('today.keyNav')}
          </span>
          <span>
            <kbd>w</kbd> {t('today.watch')}
          </span>
          <span>
            <kbd>x</kbd> {t('today.dismiss')}
          </span>
          <span>
            <kbd>i</kbd> {t('today.investigate')}
          </span>
          <span>
            <kbd>d</kbd> {t('today.decide')}
          </span>
        </p>
      ) : null}

      {cards.length > 1 ? (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 thin-scroll">
          {cards.map((c, i) => (
            <button
              key={c.id ?? c.eventId}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'max-w-[10rem] shrink-0 truncate rounded-md border px-2.5 py-1.5 text-left text-xs transition',
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

      <div className={cn(exiting ? 'deck-slide-out' : 'deck-slide-in')}>
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
                className="inline-flex items-center rounded-md bg-accent px-2 py-1 text-xs font-medium text-white hover:bg-accent/90"
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

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onWatch(card)} disabled={busy} className="gap-1.5">
            <Eye size={14} aria-hidden />
            {t('today.watch')}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => runExit(() => onDismiss(card))}
            disabled={busy}
            className="gap-1.5"
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
          >
            <SkipForward size={14} aria-hidden />
            {t('today.decide')}
          </Button>
        </div>
      </div>
    </section>
  )
}
