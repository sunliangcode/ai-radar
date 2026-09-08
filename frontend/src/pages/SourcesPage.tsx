import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { Button, PageHeader, StateBox } from '../components/ui'
import { FetchProgressPanel } from '../components/FetchProgressPanel'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { dateLocale } from '../i18n'

const TYPES = ['RSS', 'HACKER_NEWS', 'REDDIT', 'GITHUB', 'FIXTURE'] as const

export default function SourcesPage() {
  const { t, i18n } = useTranslation()
  const qc = useQueryClient()
  const sources = useQuery({ queryKey: ['sources'], queryFn: api.sources })
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<(typeof TYPES)[number]>('RSS')
  const [feedUrl, setFeedUrl] = useState('')
  const [subreddits, setSubreddits] = useState('MachineLearning,LocalLLaMA')
  const [query, setQuery] = useState('AI OR LLM')
  const locale = dateLocale(i18n.language)

  const create = useMutation({
    mutationFn: api.createSource,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sources'] })
      setOpen(false)
      setName('')
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
  const { fetchJob, progress, showPanel, isPending } = useFetchJobWithProgress([['sources']])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    let config: Record<string, unknown> = {}
    if (type === 'RSS') config = { feedUrl }
    if (type === 'FIXTURE') config = { path: feedUrl || 'fixtures/demo-events.json' }
    if (type === 'REDDIT') config = { subreddits: subreddits.split(/[,\s]+/).filter(Boolean) }
    if (type === 'HACKER_NEWS' || type === 'GITHUB') config = { query }
    create.mutate({ name, type, enabled: true, config })
  }

  return (
    <div>
      <PageHeader
        title={t('sources.title')}
        subtitle={t('sources.subtitle')}
        actions={
          <>
            <Button variant="ghost" onClick={() => fetchJob.mutate()} disabled={isPending}>
              {isPending ? t('common.fetching') : t('common.fetchNow')}
            </Button>
            <Button onClick={() => setOpen((v) => !v)}>{open ? t('common.cancel') : t('sources.add')}</Button>
          </>
        }
      />

      {showPanel ? <FetchProgressPanel progress={progress} /> : null}

      {open ? (
        <form onSubmit={onSubmit} className="mb-6 grid gap-3 rounded-xl border border-mist bg-paper/80 p-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-muted">{t('sources.name')}</span>
            <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="text-sm">
            <span className="text-muted">{t('sources.type')}</span>
            <select className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={type} onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}>
              {TYPES.map((sourceType) => (
                <option key={sourceType} value={sourceType}>{sourceType}</option>
              ))}
            </select>
          </label>
          {type === 'RSS' ? (
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">{t('sources.feedUrl')}</span>
              <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} required />
            </label>
          ) : null}
          {type === 'FIXTURE' ? (
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">{t('sources.fixturePath')}</span>
              <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="fixtures/demo-events.json" />
            </label>
          ) : null}
          {type === 'REDDIT' ? (
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">{t('sources.subreddits')}</span>
              <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={subreddits} onChange={(e) => setSubreddits(e.target.value)} />
            </label>
          ) : null}
          {type === 'HACKER_NEWS' || type === 'GITHUB' ? (
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">{t('sources.query')}</span>
              <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
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
