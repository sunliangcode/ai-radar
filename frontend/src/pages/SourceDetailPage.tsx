import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ApiError, api, CLI_SETUP_SOURCE_TYPES, type Source } from '../lib/api'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  FormSaveBar,
  ListSkeleton,
  PageHeader,
  QueryErrorState,
  ScoreBar,
  useToast,
} from '../components/ui'
import { errorText } from '../lib/errors'
import { cn, focusRingClass, textLinkClass } from '../lib/cn'
import { useConnectors } from '../hooks/useConnectors'
import { useDisplaySources } from '../hooks/useDisplaySources'
import { findConnectorById } from '../lib/connectors'
import { useEscapeBack } from '../hooks/useEscapeBack'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { SourceConfigFieldInput } from './sources/SourceConfigFieldInput'
import { SourceSetupWizard } from './sources/SourceSetupWizard'
import {
  localizedSetupHint,
  setupChipClass,
  setupStateLabelKey,
} from './sources/sourceSetupUi'
import { buildSourceConfig } from './sources/buildSourceConfig'
import { useDocumentTitle } from '../hooks/useDocumentTitle'

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
  const navigate = useNavigate()
  const { id } = useParams()
  const sourceId = Number(id)
  const connectors = useConnectors()
  const { displaySourceIds, setDisplayedIds, setAllDisplayed } = useDisplaySources()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [setupOpen, setSetupOpen] = useState(false)
  const q = useQuery({
    queryKey: ['source', sourceId],
    queryFn: () => api.source(sourceId),
    enabled: Number.isFinite(sourceId),
    retry: (count, err) => {
      if (err instanceof ApiError && err.status === 404) return false
      return count < 2
    },
  })
  const { fetchJob } = useFetchJobWithProgress([
    ['source', String(sourceId)],
    ['sources'],
  ])
  const setup = useQuery({
    queryKey: ['source-setup', sourceId],
    queryFn: () => api.sourceSetup(sourceId),
    enabled:
      Number.isFinite(sourceId) &&
      !!q.data &&
      CLI_SETUP_SOURCE_TYPES.has(q.data.type.toUpperCase()),
    staleTime: 30_000,
  })
  useDocumentTitle({ title: q.data?.name ?? null })

  const descriptor = useMemo(
    () => findConnectorById(connectors.data, q.data?.type),
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
    onMutate: async (body) => {
      const enabled = (body as { enabled?: boolean })?.enabled
      if (enabled == null) return undefined
      await qc.cancelQueries({ queryKey: ['source', sourceId] })
      await qc.cancelQueries({ queryKey: ['sources'] })
      const prevSource = qc.getQueryData<Source>(['source', sourceId])
      const prevSources = qc.getQueryData<Source[]>(['sources'])
      if (prevSource) {
        qc.setQueryData<Source>(['source', sourceId], { ...prevSource, enabled })
      }
      if (prevSources) {
        qc.setQueryData<Source[]>(
          ['sources'],
          prevSources.map((s) => (s.id === sourceId ? { ...s, enabled } : s)),
        )
      }
      return { prevSource, prevSources }
    },
    onSuccess: (_data, body) => {
      const enabled = (body as { enabled?: boolean })?.enabled
      if (enabled == null) setOverrides({})
      void qc.invalidateQueries({ queryKey: ['source', sourceId] })
      void qc.invalidateQueries({ queryKey: ['sources'] })
      void qc.invalidateQueries({ queryKey: ['unread-counts'] })
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      if (enabled != null) {
        void qc.invalidateQueries({ queryKey: ['feed'] })
        void qc.invalidateQueries({ queryKey: ['feed-search'] })
        void qc.invalidateQueries({ queryKey: ['watching-saved'] })
        void qc.invalidateQueries({ queryKey: ['changes-list'] })
      }
      if (enabled == null) {
        pushToast('success', t('sources.updated'))
      } else {
        pushToast(
          'success',
          enabled ? t('sources.enabledToast') : t('sources.disabledToast'),
          {
            label: t('common.undo'),
            onClick: () => {
              void api
                .patchSource(sourceId, { enabled: !enabled })
                .then(() => {
                  void qc.invalidateQueries({ queryKey: ['source', sourceId] })
                  void qc.invalidateQueries({ queryKey: ['sources'] })
                  void qc.invalidateQueries({ queryKey: ['unread-counts'] })
                  void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
                  void qc.invalidateQueries({ queryKey: ['feed'] })
                  void qc.invalidateQueries({ queryKey: ['feed-search'] })
                  void qc.invalidateQueries({ queryKey: ['watching-saved'] })
                  void qc.invalidateQueries({ queryKey: ['changes-list'] })
                })
                .catch(() => undefined)
            },
          },
        )
      }
      queueMicrotask(() =>
        document.getElementById('source-detail-heading')?.focus({ preventScroll: true }),
      )
    },
    onError: (e, _body, ctx) => {
      if (ctx?.prevSource) qc.setQueryData(['source', sourceId], ctx.prevSource)
      if (ctx?.prevSources) qc.setQueryData(['sources'], ctx.prevSources)
      pushToast('error', errorText(e, t))
    },
  })

  const remove = useMutation({
    mutationFn: () => api.deleteSource(sourceId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['sources'] })
      const prev = qc.getQueryData<Source[]>(['sources'])
      if (prev) qc.setQueryData<Source[]>(['sources'], prev.filter((s) => s.id !== sourceId))
      if (displaySourceIds?.includes(sourceId)) {
        const next = displaySourceIds.filter((sid) => sid !== sourceId)
        if (next.length === 0) setAllDisplayed()
        else setDisplayedIds(next)
      }
      return { prev }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sources'] })
      void qc.invalidateQueries({ queryKey: ['feed'] })
      void qc.invalidateQueries({ queryKey: ['unread-counts'] })
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      void qc.invalidateQueries({ queryKey: ['watching-timeline'] })
      void qc.invalidateQueries({ queryKey: ['watching-saved'] })
      void qc.invalidateQueries({ queryKey: ['changes-list'] })
      pushToast('success', t('sources.deleted'))
      navigate('/settings/sources', { replace: true })
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['sources'], ctx.prev)
      pushToast('error', errorText(e, t))
    },
  })

  const isDirty = Object.keys(overrides).length > 0
  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/settings/sources')
  }, [navigate])
  useEscapeBack(goBack, !isDirty && !confirmDelete)

  if (q.isLoading) return <ListSkeleton rows={4} />
  const missing =
    !q.data &&
    (q.isError
      ? q.error instanceof ApiError && q.error.status === 404
      : !q.isFetching)
  if (missing) {
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
  if (q.isError) {
    return (
      <QueryErrorState
        message={t('common.loadFailed', { message: errorText(q.error, t) })}
        onRetry={() => void q.refetch()}
      />
    )
  }
  if (!q.data) {
    return <ListSkeleton rows={4} />
  }

  const s = q.data
  const fields = descriptor?.configFields ?? []
  const isOssCli = CLI_SETUP_SOURCE_TYPES.has(s.type.toUpperCase())
  const setupStatus = setup.data
  const showInstall = Boolean(setupStatus?.installAvailable)
  const showConfigure =
    isOssCli &&
    setupStatus?.supported &&
    setupStatus.state !== 'ready' &&
    !showInstall

  function saveConfig() {
    const config = buildSourceConfig(descriptor, fieldValues)
    patch.mutate({ config })
  }

  return (
    <div aria-busy={patch.isPending || undefined}>
      {setupOpen && setupStatus ? (
        <SourceSetupWizard
          source={s}
          initial={setupStatus}
          onClose={() => {
            setSetupOpen(false)
            void setup.refetch()
            void q.refetch()
          }}
          onTestFetch={(sourceType) => fetchJob.mutate({ sourceType })}
        />
      ) : null}
      <PageHeader
        titleId="source-detail-heading"
        title={s.name}
        subtitle={`${s.type} · ${s.enabled ? t('sources.statusEnabled') : t('sources.statusDisabled')}`}
        back={{ label: t('common.backToList'), to: '/settings/sources' }}
        actions={
          <>
            {showInstall ? (
              <Button
                size="sm"
                variant="primary"
                disabled={patch.isPending || remove.isPending}
                onClick={() => setSetupOpen(true)}
                aria-label={`${s.name}: ${t('sources.setup.install')}`}
              >
                {t('sources.setup.install')}
              </Button>
            ) : null}
            {showConfigure ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={patch.isPending || remove.isPending}
                onClick={() => setSetupOpen(true)}
                aria-label={`${s.name}: ${t('sources.setup.configure')}`}
              >
                {t('sources.setup.configure')}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant={s.enabled ? 'ghost' : 'primary'}
              loading={patch.isPending && (patch.variables as { enabled?: boolean })?.enabled != null}
              disabled={patch.isPending || remove.isPending}
              onClick={() => patch.mutate({ enabled: !s.enabled })}
              aria-pressed={s.enabled}
              aria-label={`${s.name}: ${s.enabled ? t('sources.disable') : t('sources.enable')}`}
            >
              {s.enabled ? t('sources.disable') : t('sources.enable')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={patch.isPending || remove.isPending}
              onClick={() => setConfirmDelete(true)}
              aria-label={t('sources.delete')}
            >
              {t('sources.delete')}
            </Button>
          </>
        }
      />

      <ConfirmDialog
        open={confirmDelete}
        title={t('sources.deleteConfirm', { name: s.name })}
        description={t('sources.deleteConfirmHint')}
        confirmLabel={t('sources.delete')}
        cancelLabel={t('common.cancel')}
        danger
        pending={remove.isPending}
        onConfirm={() => remove.mutate()}
        onCancel={() => {
          if (!remove.isPending) setConfirmDelete(false)
        }}
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
        {isOssCli && setupStatus?.state && setupStatus.state !== 'unsupported' ? (
          (() => {
            const setupHint = localizedSetupHint(setupStatus, t)
            const labelKey = setupStateLabelKey(setupStatus.state)
            return (
              <p className="mb-3 flex flex-wrap items-center gap-2 text-xs" role="status">
                <span
                  className={cn(
                    'rounded-sm px-1.5 py-0.5 font-medium',
                    setupChipClass(setupStatus.state),
                  )}
                >
                  {labelKey ? t(labelKey) : setupStatus.state}
                </span>
                {setupStatus.cliPath ? (
                  <span className="font-mono text-muted break-all">{setupStatus.cliPath}</span>
                ) : null}
                {setupHint ? <span className="text-muted">{setupHint}</span> : null}
              </p>
            )
          })()
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
                aria-label={t('nav.radar')}
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
                aria-label={t('common.backToList')}
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
                      aria-label={
                        item.summary ? `${item.title} · ${item.summary}` : item.title
                      }
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
