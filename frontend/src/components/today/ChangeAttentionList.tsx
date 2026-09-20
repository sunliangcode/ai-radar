import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ImpactCard } from '../../lib/api'
import { Button } from '../ui'
import { cn } from '../../lib/cn'

function tierTone(tier?: string) {
  const t = (tier ?? '').toUpperCase()
  if (t === 'HIGH') return 'text-ember'
  if (t === 'MEDIUM' || t === 'MED') return 'text-accent'
  return 'text-muted'
}

export function ChangeAttentionCard({
  card,
  index,
  total,
  busy,
  onFollow,
  onDismiss,
}: {
  card: ImpactCard
  index: number
  total: number
  busy?: boolean
  onFollow: (card: ImpactCard) => void
  onDismiss: (card: ImpactCard) => void
}) {
  const { t } = useTranslation()
  const changeId = card.changeId ?? card.eventId
  const timeline = (card.recentTimeline ?? []).slice(0, 2)
  const entities = timeline
    .map((row) => row.label)
    .filter(Boolean)
    .slice(0, 3)
    .join(' · ')

  return (
    <article className="group relative overflow-hidden rounded-2xl bg-surface px-5 py-6 shadow-[0_1px_0_0_var(--color-border)] ring-1 ring-border/80 transition hover:ring-accent/35">
      <div className="flex items-baseline justify-between gap-3">
        <p className={cn('font-mono text-[11px] tracking-wider uppercase', tierTone(card.tier))}>
          {t('today.attentionIndex', { index: index + 1, total })}
          {card.watched ? ` · ${t('today.following')}` : ''}
        </p>
      </div>

      <h3 className="mt-3 text-[1.35rem] font-semibold leading-snug tracking-tight text-ink">
        {card.title}
      </h3>
      {entities ? <p className="mt-1.5 text-xs text-muted">{entities}</p> : null}

      {card.why ? (
        <p className="mt-4 text-[15px] leading-relaxed text-ink/90">{card.why}</p>
      ) : null}

      {card.recommendation ? (
        <p className="mt-3 border-l-2 border-accent/40 pl-3 text-sm text-muted">
          {card.recommendation}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          to={`/changes/${changeId}`}
          state={{ from: '/' }}
          className="inline-flex min-h-10 items-center rounded-full bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
        >
          {t('today.exploreChange')}
        </Link>
        <Link
          to={`/chat?changeId=${changeId}`}
          className="inline-flex min-h-10 items-center rounded-full border border-border px-4 text-sm text-ink hover:border-accent/40"
        >
          {t('today.askAi')}
        </Link>
        <Button
          variant="ghost"
          className="min-h-10 rounded-full"
          disabled={busy || card.watched}
          onClick={() => onFollow(card)}
        >
          {card.watched ? t('today.following') : t('today.follow')}
        </Button>
        <Button
          variant="ghost"
          className="min-h-10 rounded-full text-muted"
          disabled={busy}
          onClick={() => onDismiss(card)}
        >
          {t('today.dismiss')}
        </Button>
      </div>
    </article>
  )
}

export function ChangeAttentionList({
  cards,
  busy,
  onFollow,
  onDismiss,
}: {
  cards: ImpactCard[]
  busy?: boolean
  onFollow: (card: ImpactCard) => void
  onDismiss: (card: ImpactCard) => void
}) {
  return (
    <div className="space-y-5">
      {cards.map((card, index) => (
        <ChangeAttentionCard
          key={card.id ?? card.eventId}
          card={card}
          index={index}
          total={cards.length}
          busy={busy}
          onFollow={onFollow}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}
