import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { Button, EmptyState, PageHeader, StateBox, useToast } from '../components/ui'
import { PackPicker } from '../components/PackPicker'
import { FetchProgressSection } from '../components/fetch/FetchProgressSection'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { useSources } from '../hooks/useSources'
import { useConnectors } from '../hooks/useConnectors'
import { dateLocale } from '../i18n'
import { errorText } from '../lib/errors'
import { SourceCreateForm } from './sources/SourceCreateForm'
import { SourceList } from './sources/SourceList'

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
    onError: (e) => pushToast('error', errorText(e, t)),
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
          onSubmit={(config, sourceType) =>
            create.mutate({ name, type: sourceType, enabled: true, config })
          }
        />
      ) : null}

      {sources.isLoading ? <StateBox>{t('sources.loading')}</StateBox> : null}
      {sources.isError ? (
        <StateBox>{t('common.loadFailed', { message: errorText(sources.error, t) })}</StateBox>
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
        <SourceList
          sources={sources.data}
          locale={locale}
          fetchPending={isPending}
          patchPending={patch.isPending}
          removePending={remove.isPending}
          onTestFetch={(sourceType) => fetchJob.mutate({ sourceType })}
          onToggleEnabled={(id, enabled) => patch.mutate({ id, body: { enabled } })}
          onDelete={(id) => remove.mutate(id)}
        />
      ) : null}
    </div>
  )
}
