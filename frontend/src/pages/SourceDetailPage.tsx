import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { EmptyState, FormSaveBar, ListSkeleton, PageHeader, QueryErrorState, ScoreBar, useToast } from '../components/ui'
import { errorText } from '../lib/errors'
import { cn, focusRingClass, textLinkClass } from '../lib/cn'
import { useConnectors } from '../hooks/useConnectors'
import { SourceConfigFieldInput } from './sources/SourceConfigFieldInput'
import { buildSourceConfig } from './sources/buildSourceConfig'

function configToFieldValues(config: Record<string, unknown> | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  if (!config) return out
  for (const [key, value] of Object.entries(config)) {
    if (value == null) continue
    if (Array.isArray(value)) out[key] = value.map(String).join(', ')
    else if (typeof value === 'object') out[key] = JSON.stringify(value)
    else out[key] = String(value)
  }
  return out
}

export default function SourceDetailPage() {
  const { t } = useTranslation()
  const { push: pushToast } = useToast()
  const qc = useQueryClient()
  const { id } = useParams()
  const sourceId = Number(id)
  const connectors = useConnectors()
  const q = useQuery({
    queryKey: ['source', sourceId],
    queryFn: () => api.source(sourceId),
    enabled: Number.isFinite(sourceId),
  })

  const descriptor = useMemo(
    () => connectors.data?.find((d) => d.id === q.data?.type),
    [connectors.data, q.data?.type],
  )

  const serverValues = useMemo(
    () => configToFieldValues(q.data?.config),
    [q.data?.config],
  )
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const fieldValues = { ...serverValues, ...overrides }

  useEffect(() => {
    setOverrides({})
  }, [sourceId])

  const patch = useMutation({
    mutationFn: (body: unknown) => api.patchSource(sourceId, body),
    onSuccess: () => {
      setOverrides({})
      void qc.invalidateQueries({ queryKey: ['source', sourceId] })
      void qc.invalidateQueries({ queryKey: ['sources'] })
      pushToast('success', t('sources.updated'))
    },
    onError: (e) => pushToast('error', errorText(e, t)),
  })

  if (q.isLoading) return <ListSkeleton rows={4} />
  if (q.isError) {
    return (
      <QueryErrorState
        message={t('common.loadFailed', { message: errorText(q.error, t) })}
        onRetry={() => void q.refetch()}
      />
    )
  }
  if (!q.data) {
    return (
      <EmptyState
        title={t('sources.notFound')}
        primary={
          <Link
            to="/settings/sources"
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

  const s = q.data
  const fields = descriptor?.configFields ?? []
  const isOssCli = s.type === 'ZHIHU' || s.type === 'WEIBO' || s.type === 'BILIBILI'
  const isDirty = Object.keys(overrides).length > 0

  function saveConfig() {
    const config = buildSourceConfig(descriptor, fieldValues)
    patch.mutate({ config })
  }

  return (
    <div aria-busy={patch.isPending || undefined}>
      <PageHeader
        title={s.name}
        subtitle={`${s.type} · ${s.enabled ? t('sources.statusEnabled') : t('sources.statusDisabled')}`}
        back={{ label: t('common.backToList'), to: '/settings/sources' }}
      />

      <section
        className="mb-6 rounded-xl border border-border bg-surface/80 p-4"
        aria-busy={patch.isPending || undefined}
        aria-labelledby="source-config-heading"
      >
        <h2 id="source-config-heading" className="mb-3 font-serif text-lg text-ink">
          {t('sources.config')}
        </h2>
        {isOssCli ? (
          <p className="mb-3 text-xs text-muted">{t('sources.ossCliHint')}</p>
        ) : null}
        {fields.length === 0 ? (
          <p className="text-sm text-muted">—</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((field) => (
              <SourceConfigFieldInput
                key={field.key}
                field={field}
                value={fieldValues[field.key] ?? ''}
                onChange={(v) => setOverrides((prev) => ({ ...prev, [field.key]: v }))}
                pasteLabel={t('sources.pasteCookie')}
              />
            ))}
          </div>
        )}
        {fields.length > 0 ? (
          <FormSaveBar
            dirty={isDirty}
            saving={patch.isPending}
            onSave={saveConfig}
            onDiscard={() => setOverrides({})}
          />
        ) : null}
      </section>

      <section aria-labelledby="source-sample-heading">
        <h2 id="source-sample-heading" className="mb-2 font-serif text-xl">
          {t('sources.sampleItems')}
        </h2>
        {!s.sampleItems?.length ? (
          <EmptyState
            title={t('sources.noSampleItems')}
            description={t('sources.noSampleItemsHint')}
            primary={
              <Link
                to="/radar"
                className={cn(
                  'inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:border-accent/40',
                  focusRingClass(),
                )}
              >
                {t('nav.radar')}
              </Link>
            }
            secondary={
              <Link
                to="/settings/sources"
                className={cn(
                  'inline-flex min-h-10 items-center rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-ink',
                  focusRingClass(),
                )}
              >
                {t('common.backToList')}
              </Link>
            }
          />
        ) : (
          <div className="rounded-xl border border-border bg-surface/70 px-4">
            {s.sampleItems.map((item) => (
              <article key={item.id} className="row-py border-b border-border/70 last:border-0">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5 w-12 shrink-0">
                    <ScoreBar score={item.score} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <a
                      href={item.canonicalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex min-h-9 items-center font-medium text-ink transition duration-150 motion-reduce:transition-none ${textLinkClass()}`}
                    >
                      {item.title}
                    </a>
                    {item.summary ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                        {item.summary}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
