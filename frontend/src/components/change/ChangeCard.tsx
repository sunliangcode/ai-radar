import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { ImpactCard } from '../../lib/api'
import { Button, StatusBadge } from '../ui'
import { cn, textLinkClass } from '../../lib/cn'

function tierDot(tier?: string) {
  const t = (tier ?? '').toUpperCase()
  if (t === 'HIGH') return 'bg-ember'
  if (t === 'MEDIUM' || t === 'MED') return 'bg-accent'
  return 'bg-moss'
}

export function ChangeCard({
  card,
  onWatch,
  onDismiss,
  onDecide,
  onInvestigate,
  busy,
}: {
  card: ImpactCard
  onWatch: () => void
  onDismiss: () => void
  onDecide: () => void
  onInvestigate: () => void
  busy?: boolean
}) {
  const { t } = useTranslation()
  const changeId = card.eventId ?? card.changeId
  const timeline = card.recentTimeline ?? []

  return (
    <article
      className="rounded-xl border border-border bg-surface p-5 shadow-sm"
      aria-busy={busy || undefined}
    >
      <div className="mb-3 flex flex-wrap items-start gap-2">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${tierDot(card.tier)}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold leading-snug text-ink">{card.title}</h3>
          {card.tier ? (
            <div className="mt-1">
              <StatusBadge status={card.tier} />
            </div>
          ) : null}
        </div>
        {changeId ? (
          <Link
            to={`/changes/${changeId}`}
            state={{ from: '/' }}
            className={cn('inline-flex min-h-9 items-center text-xs', textLinkClass())}
          >
            {t('today.openChange')} →
          </Link>
        ) : null}
      </div>

      {card.why ? (
        <section className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-accent">{t('today.whyLabel')}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{card.why}</p>
        </section>
      ) : null}

      {timeline.length > 0 || card.changeSummary ? (
        <section className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{t('today.whatChanged')}</p>
          {card.changeSummary ? (
            <p className="mt-1 text-sm text-muted">{card.changeSummary}</p>
          ) : null}
          {timeline.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm text-ink">
              {timeline.map((node, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-faint">·</span>
                  <span>{node.label}{node.note ? ` — ${node.note}` : ''}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {card.recommendation ? (
        <section className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{t('today.recommendationLabel')}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{card.recommendation}</p>
        </section>
      ) : null}

      <div
        className="flex flex-wrap gap-2 border-t border-border pt-4"
        role="group"
        aria-label={card.title}
        aria-busy={busy || undefined}
      >
        <Button variant="ghost" size="sm" onClick={onDecide} disabled={busy}>
          {t('today.decide')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onWatch} disabled={busy}>
          {t('today.watch')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss} disabled={busy}>
          {t('today.dismiss')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onInvestigate} disabled={busy}>
          {t('today.investigate')}
        </Button>
      </div>
    </article>
  )
}
