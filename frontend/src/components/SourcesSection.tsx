import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ConnectorDescriptor } from '../lib/api'
import { Button, EmptyState, StateBox } from './ui'
import { FetchProgressPanel } from './FetchProgressPanel'
import { FetchResultSummary } from './FetchResultSummary'
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

export function SourcesSection() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const sources = useQuery({ queryKey: ['sources'], queryFn: api.sources })
  const connectors = useQuery({ queryKey: ['connectors'], queryFn: api.connectors })
  const [open, setOpen] = useState(false)
  const [showMoreTypes, setShowMoreTypes] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('RSS')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [packId, setPackId] = useState(i18n.language.startsWith('zh') ? 'ai-cn' : 'ai-core')
  const [toast, setToast] = useState<string | null>(null)
  const locale = dateLocale(i18n.language)

  const descriptors = useMemo(() => connectors.data ?? [], [connectors.data])
  const rssDescriptor = useMemo(() => descriptors.find((d) => d.id === 'RSS'), [descriptors])
  const otherDescriptors = useMemo(
    () => descriptors.filter((d) => d.id !== 'RSS'),
    [descriptors],
  )
  const selected = useMemo(() => {
    if (!showMoreTypes && rssDescriptor) return rssDescriptor
    return descriptors.find((d) => d.id === type) ?? descriptors[0] ?? rssDescriptor
  }, [descriptors, rssDescriptor, showMoreTypes, type])

  const create = useMutation({
    mutationFn: api.createSource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      setOpen(false)
      setName('')
      setFieldValues({})
      setShowMoreTypes(false)
      setType('RSS')
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
  const importPack = useMutation({
    mutationFn: () => api.importPack({ packId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      setToast(t('settings.packImported'))
      setTimeout(() => setToast(null), 2500)
    },
    onError: (e) => {
      setToast((e as Error).message)
      setTimeout(() => setToast(null), 4000)
    },
  })
  const { fetchJob, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
    ['sources'],
    ['intelligence-home'],
    ['briefs'],
  ])

  function onTypeChange(next: string) {
    setType(next)
    setFieldValues({})
  }

  function openAddForm(preferRss = true) {
    setOpen(true)
    setShowMoreTypes(!preferRss)
    setType(preferRss ? 'RSS' : type)
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

  const isEmpty = !sources.isLoading && sources.data?.length === 0

  return (
    <section id="sources" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg text-ink">{t('contexts.sourcesSection')}</h3>
          <p className="mt-1 text-xs text-muted">{t('sources.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => fetchJob.mutate()} loading={isPending}>
            {phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
          </Button>
          <Button
            onClick={() => {
              if (open) setOpen(false)
              else openAddForm(true)
            }}
            disabled={isPending}
          >
            {open ? t('common.cancel') : t('sources.addRss')}
          </Button>
        </div>
      </div>

      {phase === 'running' ? <FetchProgressPanel progress={progress} /> : null}
      {phase === 'summary' ? <FetchResultSummary progress={progress} onDismiss={() => void dismiss()} /> : null}
      {toast ? (
        <p className="text-sm text-moss" role="status">
          {toast}
        </p>
      ) : null}

      {open ? (
        <form onSubmit={onSubmit} className="grid gap-3 rounded-xl border border-mist bg-paper/80 p-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-muted">{t('sources.name')}</span>
            <input
              className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          {showMoreTypes ? (
            <label className="text-sm">
              <span className="text-muted">{t('sources.type')}</span>
              <select
                className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2"
                value={selected?.id ?? type}
                onChange={(e) => onTypeChange(e.target.value)}
              >
                {(descriptors.length ? descriptors : [{ id: type, displayName: type, configFields: [] }]).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.displayName}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="flex items-end text-sm">
              <button
                type="button"
                className="text-moss underline underline-offset-2"
                onClick={() => {
                  setShowMoreTypes(true)
                  if (otherDescriptors[0]) onTypeChange(otherDescriptors[0].id)
                }}
              >
                {t('sources.moreTypes')}
              </button>
            </div>
          )}
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
          <div className="sm:col-span-2">
            <Button type="submit" loading={create.isPending}>
              {create.isPending ? t('common.saving') : t('sources.create')}
            </Button>
          </div>
        </form>
      ) : null}

      {sources.isLoading ? <StateBox>{t('sources.loading')}</StateBox> : null}
      {sources.isError ? (
        <StateBox>{t('common.loadFailed', { message: (sources.error as Error).message })}</StateBox>
      ) : null}
      {isEmpty && !open ? (
        <EmptyState
          title={t('sources.emptyTitle')}
          description={t('sources.emptyDescription')}
          primary={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <select
                className="rounded-md border border-mist bg-paper px-3 py-2 text-sm"
                value={packId}
                onChange={(e) => setPackId(e.target.value)}
                aria-label={t('sources.importPack')}
              >
                <option value="ai-core">{t('home.pack.ai-core')}</option>
                <option value="ai-cn">{t('home.pack.ai-cn')}</option>
                <option value="ai-signals">{t('home.pack.ai-signals')}</option>
              </select>
              <Button loading={importPack.isPending} onClick={() => importPack.mutate()}>
                {importPack.isPending ? t('settings.importing') : t('sources.importPack')}
              </Button>
            </div>
          }
          secondary={
            <Button variant="ghost" onClick={() => openAddForm(true)}>
              {t('sources.addRss')}
            </Button>
          }
        />
      ) : null}

      {!isEmpty ? (
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
      ) : null}
    </section>
  )
}
