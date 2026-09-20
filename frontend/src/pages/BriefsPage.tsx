import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type BriefSummary } from '../lib/api'
import {
  Button,
  EmptyState,
  ListSkeleton,
  PageHeader,
  QueryErrorState,
  useToast,
} from '../components/ui'
import { FetchProgressSection } from '../components/fetch/FetchProgressSection'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { errorText } from '../lib/errors'
import { formatPushResult, type PushResultBody } from '../lib/formatPushResult'
import { dateLocale } from '../i18n'
import { cn, focusRingClass } from '../lib/cn'

function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseBriefDate(date: string): Date {
  return new Date(`${date}T00:00:00`)
}

function briefDateParts(date: string, locale: string) {
  const d = parseBriefDate(date)
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString(locale, { month: 'short' }),
    full: d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    }),
  }
}

function BriefCard({
  brief,
  locale,
  featured,
  isToday,
}: {
  brief: BriefSummary
  locale: string
  featured?: boolean
  isToday?: boolean
}) {
  const { t } = useTranslation()
  const parts = briefDateParts(brief.date, locale)
  const labelParts = [parts.full]
  if (isToday) labelParts.push(t('briefs.todayBadge'))
  if (featured) labelParts.push(t('briefs.latest'))

  return (
    <Link
      to={`/briefs/${brief.date}`}
      aria-label={labelParts.join(' · ')}
      className={cn(
        'brief-card group flex gap-4 rounded-2xl border border-border bg-surface p-4 transition duration-150 motion-reduce:transition-none',
        'hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_8px_22px_color-mix(in_srgb,var(--color-ink)_8%,transparent)] motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none',
        focusRingClass(),
        featured && 'brief-card--featured md:p-6',
        isToday && 'brief-card--today',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 flex-col items-center justify-center rounded-xl bg-bg px-3 py-2 text-center',
          featured ? 'min-w-16 md:min-w-20' : 'min-w-14',
        )}
      >
        <span
          className={cn(
            'font-semibold leading-none tabular-nums text-ink',
            featured ? 'text-3xl md:text-4xl' : 'text-2xl',
          )}
        >
          {parts.day}
        </span>
        <span className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">
          {parts.month}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {isToday ? (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
              {t('briefs.todayBadge')}
            </span>
          ) : null}
          {featured ? (
            <span className="text-[11px] font-medium uppercase tracking-wide text-moss">
              {t('briefs.latest')}
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            'mt-1 font-medium text-ink',
            featured ? 'text-lg md:text-xl' : 'text-base',
          )}
        >
          {parts.full}
        </p>
        <p className="mt-1 text-sm text-muted">
          {featured ? t('briefs.latestHint') : t('briefs.openHint')}
        </p>
      </div>

      <ChevronRight
        className="mt-1 h-5 w-5 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-accent motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        aria-hidden
      />
    </Link>
  )
}

/**
 * Index of generated daily briefs.
 *
 * `/briefs/:date` existed but nothing linked to it, so the whole digest feature was only reachable
 * by typing a URL. This page makes it discoverable from the sidebar.
 */
export default function BriefsPage() {
  const { t, i18n } = useTranslation()
  const locale = dateLocale(i18n.language)
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const briefs = useQuery({ queryKey: ['briefs'], queryFn: api.briefs })
  const today = todayIso()

  const { fetchJob, retryFailed, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['briefs'],
  ])

  const pushNow = useMutation({
    mutationFn: api.pushJob,
    onSuccess: (body) => {
      void qc.invalidateQueries({ queryKey: ['jobs-schedule'] })
      const result = body as PushResultBody
      const failed = (result.results ?? []).some((r) => r.success === false && !r.skipped)
      pushToast(failed ? 'error' : 'success', formatPushResult(result, t))
    },
    onError: (e) => pushToast('error', t('common.loadFailed', { message: errorText(e, t) })),
  })

  const list = briefs.data ?? []
  const [latest, ...rest] = list
  const hasToday = list.some((b) => b.date === today)

  return (
    <div aria-busy={isPending || pushNow.isPending || undefined}>
      <PageHeader
        title={t('briefs.title')}
        subtitle={t('briefs.subtitle')}
        actions={
          <>
            <Button
              variant="ghost"
              onClick={() => pushNow.mutate()}
              loading={pushNow.isPending}
              disabled={!hasToday || pushNow.isPending}
              title={!hasToday ? t('briefs.pushNeedToday') : undefined}
              aria-label={!hasToday ? t('briefs.pushNeedToday') : t('briefs.pushToday')}
            >
              {pushNow.isPending ? t('common.pushing') : t('briefs.pushToday')}
            </Button>
            <Button onClick={() => fetchJob.mutate()} loading={isPending} disabled={isPending}>
              {phase === 'running' ? t('common.fetching') : t('briefs.generate')}
            </Button>
          </>
        }
      />

      <FetchProgressSection
        phase={phase}
        progress={progress}
        onDismiss={() => void dismiss()}
        retrying={retryFailed.isPending}
        onRetryFailed={(types) => retryFailed.mutate(types)}
      />

      {briefs.isLoading ? <ListSkeleton rows={5} /> : null}
      {briefs.isError ? (
        <QueryErrorState
          message={t('common.loadFailed', { message: errorText(briefs.error, t) })}
          onRetry={() => void briefs.refetch()}
        />
      ) : null}
      {!briefs.isLoading && !briefs.isError && list.length === 0 ? (
        <EmptyState
          title={t('briefs.emptyTitle')}
          description={t('briefs.emptyDescription')}
          primary={
            <Button onClick={() => fetchJob.mutate()} loading={isPending}>
              {t('briefs.generate')}
            </Button>
          }
          secondary={
            <Link
              to="/"
              className={cn(
                'inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-ink',
                focusRingClass(),
              )}
            >
              {t('common.backToToday')}
            </Link>
          }
        />
      ) : null}

      {list.length > 0 ? (
        <div className="space-y-6" aria-busy={briefs.isFetching || undefined}>
          {latest ? (
            <section aria-label={t('briefs.latest')}>
              <BriefCard
                brief={latest}
                locale={locale}
                featured
                isToday={latest.date === today}
              />
            </section>
          ) : null}

          {rest.length > 0 ? (
            <section aria-labelledby="briefs-archive-heading">
              <h2
                id="briefs-archive-heading"
                className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint"
              >
                {t('briefs.archive')}
              </h2>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {rest.map((b) => (
                  <li key={b.date}>
                    <BriefCard brief={b} locale={locale} isToday={b.date === today} />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
