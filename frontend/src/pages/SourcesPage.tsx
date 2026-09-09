import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ConnectorDescriptor } from '../lib/api'
import { Button, PageHeader, StateBox } from '../components/ui'
import { FetchProgressPanel } from '../components/FetchProgressPanel'
import { FetchResultSummary } from '../components/FetchResultSummary'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { dateLocale } from '../i18n'

const LIST_FIELDS = new Set([
  'subreddits',
  'channels',
  'users',
  'nodes',
  'languages',
  'keywords',
])

function buildConfig(
  descriptor: ConnectorDescriptor | undefined,
  values: Record<string, string>,
): Record<string, unknown> {
  const config: Record<string, unknown> = {}
  if (!descriptor) return config
  for (const field of descriptor.configFields) {
    const raw = (values[field.key] ?? '').trim()
    if (!raw) continue
    if (LIST_FIELDS.has(field.key)) {
      config[field.key] = raw.split(/[,\s]+/).filter(Boolean)
    } else if (/^(max|limit|perPage|hitsPerPage|fetchLimit|maxItems|maxResults|maxRecords|maxMessages)$/i.test(field.key)) {
      const n = Number(raw)
      config[field.key] = Number.isFinite(n) ? n : raw
    } else {
      config[field.key] = raw
    }
  }
  return config
}

export default function SourcesPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const sources = useQuery({ queryKey: ['sources'], queryFn: api.sources })
  const connectors = useQuery({ queryKey: ['connectors'], queryFn: api.connectors })
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('RSS')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const locale = dateLocale(i18n.language)

  const descriptors = useMemo(() => connectors.data ?? [], [connectors.data])
  const selected = useMemo(
    () => descriptors.find((d) => d.id === type) ?? descriptors[0],
    [descriptors, type],
  )

  const create = useMutation({
    mutationFn: api.createSource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      setOpen(false)
      setName('')
      setFieldValues({})
    },
  })
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: unknown }) => api.patchSource(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  })
  const remove = useMutation({
    mutationFn: api.deleteSource,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  })
  const { fetchJob, phase, progress, dismiss, isPending } = useFetchJobWithProgress([['sources']])

  function onTypeChange(next: string) {
    setType(next)
    setFieldValues({})
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const sourceType = selected?.id ?? type
    create.mutate({
      name,
      type: sourceType,
      enabled: true,
      config: buildConfig(selected, fieldValues),
    })
  }

  return (
    <div>
      <PageHeader
        title={t('sources.title')}
        subtitle={t('sources.subtitle')}
        actions={
          <>
            <Button variant="ghost" onClick={() => fetchJob.mutate()} disabled={isPending} aria-busy={isPending}>
              {phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
            </Button>
            <Button onClick={() => setOpen((v) => !v)} disabled={isPending}>
              {open ? t('common.cancel') : t('sources.add')}
            </Button>
          </>
        }
      />

      {phase === 'running' ? <FetchProgressPanel progress={progress} /> : null}
      {phase === 'summary' ? <FetchResultSummary progress={progress} onDismiss={() => void dismiss()} /> : null}

      {open ? (
        <form onSubmit={onSubmit} className="mb-6 grid gap-3 rounded-xl border border-mist bg-paper/80 p-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-muted">{t('sources.name')}</span>
            <input
              className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className="text-sm">
            <span className="text-muted">{t('sources.type')}</span>
            <select
              className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2"
              value={selected?.id ?? type}
              onChange={(e) => onTypeChange(e.target.value)}
            >
              {(descriptors.length ? descriptors : [{ id: type, displayName: type, configFields: [] }]).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.displayName} ({d.id})
                </option>
              ))}
            </select>
          </label>
          {selected?.configFields.map((field) => (
            <label key={field.key} className="text-sm sm:col-span-2">
              <span className="text-muted">
                {field.label}
                {field.required ? ' *' : ''}
              </span>
              {field.key.toLowerCase().includes('prompt') ? (
                <textarea
                  className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2"
                  rows={3}
                  value={fieldValues[field.key] ?? ''}
                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  required={field.required}
                />
              ) : (
                <input
                  className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2"
                  value={fieldValues[field.key] ?? ''}
                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  required={field.required}
                />
              )}
            </label>
          ))}
          {selected?.id === 'PRODUCT_HUNT' ? (
            <p className="text-xs text-muted sm:col-span-2">{t('sources.phTokenHint')}</p>
          ) : null}
          {selected?.id === 'TWITTER' ? (
            <p className="text-xs text-muted sm:col-span-2">{t('sources.apifyTokenHint')}</p>
          ) : null}
          {selected?.id === 'EMAIL' ? (
            <p className="text-xs text-muted sm:col-span-2">{t('sources.emailHint')}</p>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? t('common.saving') : t('sources.create')}
            </Button>
            {create.isError ? <span className="ml-3 text-sm text-ember">{(create.error as Error).message}</span> : null}
          </div>
        </form>
      ) : null}

      {sources.isLoading ? <StateBox>{t('sources.loading')}</StateBox> : null}
      {sources.isError ? (
        <StateBox>{t('common.loadFailed', { message: (sources.error as Error).message })}</StateBox>
      ) : null}
      {!sources.isLoading && sources.data?.length === 0 ? <StateBox>{t('sources.empty')}</StateBox> : null}

      <ul className="divide-y divide-mist rounded-xl border border-mist bg-paper/70">
        {sources.data?.map((s) => (
          <li key={s.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link to={`/sources/${s.id}`} className="font-medium text-ink hover:text-moss">
                {s.name}
              </Link>
              <p className="mt-1 font-mono text-xs text-muted">
                {s.type} · {s.enabled ? t('common.enabled') : t('common.disabled')}
                {s.lastFetchedAt
                  ? ` · ${t('common.lastFetched', { time: new Date(s.lastFetchedAt).toLocaleString(locale) })}`
                  : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => patch.mutate({ id: s.id, body: { enabled: !s.enabled } })}
              >
                {s.enabled ? t('sources.disable') : t('sources.enable')}
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  if (confirm(t('sources.deleteConfirm', { name: s.name }))) remove.mutate(s.id)
                }}
              >
                {t('sources.delete')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
