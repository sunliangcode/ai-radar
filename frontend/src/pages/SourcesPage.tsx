import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type Source } from '../lib/api'
import { Button, EmptyState, ListSkeleton, PageHeader, QueryErrorState, useToast } from '../components/ui'
import { PackPicker } from '../components/PackPicker'
import { FetchProgressSection } from '../components/fetch/FetchProgressSection'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { useEscapeBack } from '../hooks/useEscapeBack'
import { useSources } from '../hooks/useSources'
import { useConnectors } from '../hooks/useConnectors'
import { findConnectorById } from '../lib/connectors'
import { dateLocale } from '../i18n'
import { errorText } from '../lib/errors'
import { SourceCreateForm } from './sources/SourceCreateForm'
import { SourceList } from './sources/SourceList'
import { SourceDisplayPicker } from './sources/SourceDisplayPicker'

export default function SourcesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const sources = useSources()
  const connectors = useConnectors()
  const [open, setOpen] = useState(false)
  const [showMoreTypes, setShowMoreTypes] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState('RSS')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const locale = dateLocale(i18n.language)

  const goBack = useCallback(() => {
    navigate('/settings')
  }, [navigate])
  // Create form owns Esc while open; otherwise return to Settings hub
  useEscapeBack(goBack, !open)

  const descriptors = useMemo(() => connectors.data ?? [], [connectors.data])
  const rssDescriptor = useMemo(() => findConnectorById(descriptors, 'RSS'), [descriptors])
  const otherDescriptors = useMemo(
    () => descriptors.filter((d) => d.id.trim().toUpperCase() !== 'RSS'),
    [descriptors],
  )
  const selected = useMemo(() => {
    if (!showMoreTypes && rssDescriptor) return rssDescriptor
    return findConnectorById(descriptors, type) ?? descriptors[0] ?? rssDescriptor
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
      pushToast('success', t('sources.created'))
      // Return focus to Add after form unmounts (next paint)
      queueMicrotask(() => document.getElementById('sources-add-btn')?.focus())
    },
    onError: (e) => pushToast('error', errorText(e, t)),
  })
  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: unknown }) => api.patchSource(id, body),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['sources'] })
      const prev = qc.getQueryData<Source[]>(['sources'])
      const enabled = (vars.body as { enabled?: boolean })?.enabled
      if (prev && enabled != null) {
        qc.setQueryData<Source[]>(
          ['sources'],
          prev.map((s) => (s.id === vars.id ? { ...s, enabled } : s)),
        )
      }
      return { prev }
    },
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
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['sources'], ctx.prev)
      pushToast('error', errorText(e, t))
    },
  })
  const remove = useMutation({
    mutationFn: api.deleteSource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      pushToast('success', t('sources.deleted'))
    },
    onError: (e) => pushToast('error', errorText(e, t)),
  })
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

  const isEmpty = !sources.isLoading && sources.data?.length === 0

  return (
    <div aria-busy={isPending || create.isPending || sources.isFetching || undefined}>
      <PageHeader
        titleId="sources-page-heading"
        title={t('sources.title')}
        subtitle={t('sources.subtitle')}
        back={{ label: t('common.backToList'), onClick: goBack }}
        actions={
          <>
            <Button
              id="sources-fetch-btn"
              variant="ghost"
              onClick={() => fetchJob.mutate()}
              loading={isPending}
              disabled={isPending}
              aria-label={phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
            >
              {phase === 'running' ? t('common.fetching') : t('common.fetchNow')}
            </Button>
            <Button
              id="sources-add-btn"
              onClick={() => {
                if (open) {
                  setOpen(false)
                } else {
                  openAddForm(true)
                }
              }}
              disabled={isPending}
              aria-expanded={open}
              aria-controls={open ? 'source-create-form' : undefined}
              aria-label={open ? t('common.cancel') : t('sources.addRss')}
            >
              {open ? t('common.cancel') : t('sources.addRss')}
            </Button>
          </>
        }
      />

      <FetchProgressSection
        phase={phase}
        progress={progress}
        onDismiss={() => {
          void dismiss()
          queueMicrotask(() => document.getElementById('sources-fetch-btn')?.focus())
        }}
        retrying={retryFailed.isPending}
        onRetryFailed={(types) => retryFailed.mutate(types)}
      />

      {open ? (
        <SourceCreateForm
          descriptors={descriptors}
          otherDescriptors={otherDescriptors}
          selected={selected}
          showMoreTypes={showMoreTypes}
          name={name}
          type={type}
          fieldValues={fieldValues}
          creating={create.isPending}
          createError={create.isError ? create.error : null}
          onNameChange={setName}
          onTypeChange={onTypeChange}
          onShowMoreTypes={() => setShowMoreTypes(true)}
          onFieldChange={(key, value) => setFieldValues((prev) => ({ ...prev, [key]: value }))}
          onCancel={() => {
            setOpen(false)
            queueMicrotask(() => document.getElementById('sources-add-btn')?.focus())
          }}
          onSubmit={(config, sourceType) =>
            create.mutate({ name, type: sourceType, enabled: true, config })
          }
        />
      ) : null}

      {sources.isLoading ? <ListSkeleton rows={5} /> : null}
      {sources.isError ? (
        <QueryErrorState
          message={t('common.loadFailed', { message: errorText(sources.error, t) })}
          onRetry={() => void sources.refetch()}
        />
      ) : null}
      {isEmpty && !open ? (
        <EmptyState
          title={t('sources.emptyTitle')}
          description={t('sources.emptyDescription')}
          primary={
            <PackPicker
              buttonLabel={t('sources.importPack')}
              className="flex flex-wrap items-center justify-center gap-3"
            />
          }
          secondary={
            <Button variant="ghost" onClick={() => openAddForm(true)}>
              {t('sources.addRss')}
            </Button>
          }
        />
      ) : null}

      {!isEmpty && sources.data ? (
        <>
        <SourceDisplayPicker sources={sources.data} />
        <SourceList
          sources={sources.data}
          locale={locale}
          fetchPending={isPending}
          testingSourceType={
            isPending ? (fetchJob.variables?.sourceType ?? '*') : null
          }
          patchPendingId={patch.isPending ? (patch.variables?.id ?? null) : null}
          removePending={remove.isPending}
          onTestFetch={(sourceType) => fetchJob.mutate({ sourceType })}
          onToggleEnabled={(id, enabled) => patch.mutate({ id, body: { enabled } })}
          onDelete={(id) => remove.mutate(id)}
        />
        </>
      ) : null}
    </div>
  )
}
