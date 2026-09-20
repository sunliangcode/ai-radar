import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { BriefEntryCard } from '../components/brief/BriefEntryCard'
import { PageHeader, ScorePill, ListSkeleton, QueryErrorState, EmptyState } from '../components/ui'
import { useDisplaySources } from '../hooks/useDisplaySources'
import { itemMatchesDisplay } from '../lib/sourceFilter'
import { errorText } from '../lib/errors'
import { dateLocale } from '../i18n'
import { parseBriefMarkdown } from '../lib/parseBriefMarkdown'
import { cn, focusRingClass } from '../lib/cn'

function briefDateParts(date: string, locale: string) {
  const d = new Date(`${date}T00:00:00`)
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString(locale, { month: 'short' }),
    titleDate: d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    weekday: d.toLocaleDateString(locale, { weekday: 'long' }),
  }
}

export default function BriefDetailPage() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const { date = '' } = useParams()
  const { displaySourceIds } = useDisplaySources()
  const q = useQuery({
    queryKey: ['brief', date],
    queryFn: () => api.brief(date),
    enabled: Boolean(date),
  })

  const parsed = useMemo(
    () => (q.data ? parseBriefMarkdown(q.data.markdown) : null),
    [q.data],
  )

  const visibleItems = useMemo(
    () => (q.data?.items ?? []).filter((item) => itemMatchesDisplay(item, displaySourceIds)),
    [q.data, displaySourceIds],
  )

  const allowedUrls = useMemo(() => {
    if (displaySourceIds === null) return null
    return new Set(visibleItems.map((i) => i.canonicalUrl).filter(Boolean))
  }, [displaySourceIds, visibleItems])

  const events = useMemo(() => {
    if (!parsed) return []
    if (allowedUrls == null) return parsed.events
    return parsed.events.filter((e) => !e.url || allowedUrls.has(e.url))
  }, [parsed, allowedUrls])

  const topItems = useMemo(() => {
    if (!parsed) return []
    if (allowedUrls == null) return parsed.topItems
    return parsed.topItems.filter((e) => !e.url || allowedUrls.has(e.url))
  }, [parsed, allowedUrls])

  const extraItems = useMemo(() => {
    if (!parsed) return []
    const inBrief = new Set(
      [...events, ...topItems].map((e) => e.url).filter(Boolean) as string[],
    )
    return visibleItems.filter((item) => !inBrief.has(item.canonicalUrl))
  }, [parsed, events, topItems, visibleItems])

  if (q.isLoading) return <ListSkeleton rows={5} />
  if (q.isError) {
    return (
      <QueryErrorState
        message={t('common.loadFailed', { message: errorText(q.error, t) })}
        onRetry={() => void q.refetch()}
      />
    )
  }
  if (!q.data || !parsed) {
    return (
      <EmptyState
        title={t('common.notFound')}
        primary={
          <Link
            to="/briefs"
            className={cn(
              'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
              focusRingClass(),
            )}
          >
            {t('common.backToList')}
          </Link>
        }
      />
    )
  }

  const parts = briefDateParts(q.data.date, locale)
  const curatedCount = events.length + topItems.length
  const hasCurated = curatedCount > 0

  return (
    <div className="mx-auto max-w-3xl" aria-busy={q.isFetching || undefined}>
      <PageHeader
        title={t('briefs.detailTitle', { date: parts.titleDate })}
        subtitle={parts.weekday}
        back={{ label: t('briefs.backToArchive'), to: '/briefs' }}
      />

      <header
        className={cn(
          'brief-detail-hero mb-6 flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 md:p-5',
          'brief-card--featured',
        )}
        aria-label={parts.titleDate}
      >
        <div className="flex min-w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-bg px-3 py-2 text-center">
          <span className="text-3xl font-semibold leading-none tabular-nums text-ink">{parts.day}</span>
          <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">
            {parts.month}
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-moss">
            {t('nav.briefs')}
          </p>
          <p className="mt-1 text-sm text-muted">{parts.weekday}</p>
          <p className="mt-2 text-sm text-ink">
            {hasCurated
              ? t('briefs.curatedCount', { count: curatedCount })
              : t('briefs.emptyDay')}
            {extraItems.length > 0
              ? ` · ${t('briefs.moreFromDay', { count: extraItems.length })}`
              : null}
          </p>
        </div>
      </header>

      {!hasCurated && extraItems.length === 0 ? (
        <EmptyState
          title={parsed.emptyNote ?? t('briefs.emptyDay')}
          description={t('briefs.emptyDayHint')}
          primary={
            <Link
              to="/"
              className={cn(
                'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
                focusRingClass(),
              )}
            >
              {t('common.backToToday')}
            </Link>
          }
          secondary={
            <Link
              to="/briefs"
              className={cn(
                'inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-ink',
                focusRingClass(),
              )}
            >
              {t('briefs.backToArchive')}
            </Link>
          }
        />
      ) : null}

      {events.length > 0 ? (
        <section className="mb-8" aria-labelledby="brief-events-heading">
          <h2 id="brief-events-heading" className="brief-section-label">
            {t('briefs.sectionEvents')}
          </h2>
          <ul className="space-y-3">
            {events.map((entry) => (
              <li key={`event-${entry.rank}-${entry.title}`}>
                <BriefEntryCard entry={entry} locale={locale} variant="event" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {topItems.length > 0 ? (
        <section className="mb-8" aria-labelledby="brief-top-heading">
          <h2 id="brief-top-heading" className="brief-section-label">
            {t('briefs.sectionTopItems')}
          </h2>
          <ul className="space-y-3">
            {topItems.map((entry) => (
              <li key={`item-${entry.rank}-${entry.url ?? entry.title}`}>
                <BriefEntryCard entry={entry} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {extraItems.length > 0 ? (
        <section aria-labelledby="brief-extra-heading">
          <h2 id="brief-extra-heading" className="brief-section-label">
            {t('briefs.moreFromDayTitle')}
            <span className="ml-2 font-normal normal-case tracking-normal text-muted">
              · {t('common.itemsCount', { count: extraItems.length })}
            </span>
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {extraItems.slice(0, 20).map((item) => (
              <li key={item.id}>
                <a
                  href={item.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-11 items-start gap-3 px-4 py-3 transition hover:bg-bg/80 focus-visible:outline-none focus-visible:bg-bg/80 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40 motion-reduce:transition-none"
                >
                  <ScorePill score={item.score} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-ink">
                      {item.titleDisplay || item.title}
                    </p>
                    {item.summary ? (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                        {item.summary}
                      </p>
                    ) : null}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
