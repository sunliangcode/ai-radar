import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { Button, PageHeader, ScoreBar, StateBox, useToast } from '../components/ui'
import { errorText } from '../lib/errors'
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

  if (q.isLoading) return <StateBox>{t('common.loading')}</StateBox>
  if (q.isError) return <StateBox>{t('common.loadFailed', { message: errorText(q.error, t) })}</StateBox>
  if (!q.data) return <StateBox>{t('sources.notFound')}</StateBox>

  const s = q.data
  const fields = descriptor?.configFields ?? []
  const isOssCli = s.type === 'ZHIHU' || s.type === 'WEIBO' || s.type === 'BILIBILI'

  function saveConfig() {
    const config = buildSourceConfig(descriptor, fieldValues)
    patch.mutate({ config })
  }

  return (
    <div>
      <PageHeader
        title={s.name}
        subtitle={`${s.type} · ${s.enabled ? t('sources.statusEnabled') : t('sources.statusDisabled')}`}
        actions={
          <Link to="/settings/sources" className="text-sm text-moss underline underline-offset-2">
            {t('common.backToList')}
          </Link>
        }
      />

      <section className="mb-6 rounded-xl border border-border bg-surface/80 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-serif text-lg text-ink">{t('sources.config')}</h3>
          {fields.length > 0 ? (
            <Button type="button" loading={patch.isPending} onClick={saveConfig}>
              {patch.isPending ? t('common.saving') : t('sources.saveConfig')}
            </Button>
          ) : null}
        </div>
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
      </section>

      <h3 className="mb-2 font-serif text-xl">{t('sources.sampleItems')}</h3>
      {!s.sampleItems?.length ? <StateBox>{t('sources.noSampleItems')}</StateBox> : null}
      <div className="rounded-xl border border-border bg-surface/70 px-4">
        {s.sampleItems?.map((item) => (
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
                  className="font-medium text-ink transition duration-150 hover:underline"
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
    </div>
  )
}
