import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type ConnectorDescriptor } from '../lib/api'
import { Button, ConfirmDialog, EmptyState, PageHeader, StateBox, useToast } from '../components/ui'
import { FetchProgressSection } from '../components/fetch/FetchProgressSection'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { useSources } from '../hooks/useSources'
import { useConnectors } from '../hooks/useConnectors'
import { useImportPack } from '../hooks/useImportPack'
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
  const { push: pushToast } = useToast()
  const sources = useSources()
  const connectors = useConnectors()
  const [open, setOpen] = useState(false)
  const [showMoreTypes, setShowMoreTypes] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('RSS')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [packId, setPackId] = useState(i18n.language.startsWith('zh') ? 'ai-cn' : 'ai-core')
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null)
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
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['sources'] })
      const enabled = (vars.body as { enabled?: boolean })?.enabled
      pushToast(
        'success',
        enabled == null
          ? t('sources.updated')
          : enabled
            ? t('sources.enabledToast')
            : t('sources.disabledToast'),
      )
    },
    onError: (e) => pushToast('error', (e as Error).message),
  })
  const remove = useMutation({
    mutationFn: api.deleteSource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      pushToast('success', t('sources.deleted'))
    },
    onError: (e) => pushToast('error', (e as Error).message),
  })
  const importPack = useImportPack()
  const { fetchJob, retryFailed, phase, progress, dismiss, isPending } = useFetchJobWithProgress([
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
    <div>
      <PageHeader
        title={t('sources.title')}
        subtitle={t('sources.subtitle')}
        actions={
          <>
            <Button variant="ghost" onClick={() => fetchJob.mutate()} loading={isPending}>
              {phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
            </Button>
            <Button
              onClick={() => {
                if (open) {
                  setOpen(false)
                } else {
                  openAddForm(true)
                }
              }}
              disabled={isPending}
            >
              {open ? t('common.cancel') : t('sources.addRss')}
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

      {open ? (
        <form onSubmit={onSubmit} className="mb-6 grid gap-3 rounded-xl border border-border bg-surface/80 p-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-muted">{t('sources.name')}</span>
            <input
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          {showMoreTypes ? (
            <label className="text-sm">
              <span className="text-muted">{t('sources.type')}</span>
              <select
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
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
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
                  rows={3}
                  value={fieldValues[field.key] ?? ''}
                  onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  required={field.required}
                />
              ) : (
                <input
                  className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
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
          {selected?.id === 'ZHIHU' ? (
            <p className="text-xs text-muted sm:col-span-2">{t('sources.zhihuHint')}</p>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" loading={create.isPending}>
              {create.isPending ? t('common.saving') : t('sources.create')}
            </Button>
            {create.isError ? <span className="ml-3 text-sm text-ember">{(create.error as Error).message}</span> : null}
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={deleteTarget != null}
        title={deleteTarget ? t('sources.deleteConfirm', { name: deleteTarget.name }) : ''}
        description={t('sources.deleteConfirmHint')}
        confirmLabel={t('sources.delete')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={() => {
          const target = deleteTarget
          setDeleteTarget(null)
          if (target) remove.mutate(target.id)
        }}
        onCancel={() => setDeleteTarget(null)}
      />

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
                className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={packId}
                onChange={(e) => setPackId(e.target.value)}
                aria-label={t('sources.importPack')}
              >
                <option value="ai-core">{t('home.pack.ai-core')}</option>
                <option value="ai-cn">{t('home.pack.ai-cn')}</option>
                <option value="ai-signals">{t('home.pack.ai-signals')}</option>
              </select>
              <Button loading={importPack.isPending} onClick={() => importPack.mutate(packId)}>
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
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface/70">
          {sources.data?.map((s) => (
            <li key={s.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link to={`/settings/sources/${s.id}`} className="font-medium text-ink hover:text-moss">
                  {s.name}
                </Link>
                <p className="mt-1 font-mono text-xs text-muted">
                  {s.type} · {s.enabled ? t('common.enabled') : t('common.disabled')}
                  {s.lastFetchedAt
                    ? ` · ${t('common.lastFetched', { time: new Date(s.lastFetchedAt).toLocaleString(locale) })}`
                    : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  disabled={isPending || !s.enabled}
                  title={s.enabled ? t('sources.testFetchHint') : t('sources.testFetchDisabled')}
                  onClick={() =>
                    fetchJob.mutate(
                      { sourceType: s.type },
                      {
                        onSuccess: async () => {
                          await dismiss()
                        },
                        onError: () => dismiss(),
                      },
                    )
                  }
                >
                  {isPending ? t('common.fetching') : t('sources.testFetch')}
                </Button>
                <Button
                  variant="ghost"
                  disabled={patch.isPending}
                  onClick={() => patch.mutate({ id: s.id, body: { enabled: !s.enabled } })}
                >
                  {s.enabled ? t('sources.disable') : t('sources.enable')}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => setDeleteTarget({ id: s.id, name: s.name })}
                >
                  {t('sources.delete')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
