import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { Button, PageHeader, StateBox } from '../components/ui'
import { FetchProgressPanel } from '../components/FetchProgressPanel'
import { FetchResultSummary } from '../components/FetchResultSummary'
import { useFetchJobWithProgress } from '../hooks/useFetchJobWithProgress'
import { dateLocale } from '../i18n'

const TYPES = [
  'RSS',
  'HACKER_NEWS',
  'REDDIT',
  'GITHUB',
  'GITHUB_TRENDING',
  'GOOGLE_NEWS',
  'GDELT',
  'OSS_INSIGHT',
  'V2EX',
  'TELEGRAM',
  'PRODUCT_HUNT',
  'TWITTER',
  'WEB',
  'EMAIL',
  'FIXTURE',
] as const

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
  const [channels, setChannels] = useState('')
  const [users, setUsers] = useState('karpathy,sama')
  const [nodes, setNodes] = useState('create,share,programmer')
  const [extractionPrompt, setExtractionPrompt] = useState(
    'Extract top news/posts with title, url, and short content.',
  )
  const [languages, setLanguages] = useState('All')
  const [keywords, setKeywords] = useState('AI,LLM,agent')
  const [hl, setHl] = useState('en')
  const [gl, setGl] = useState('US')
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
  const { fetchJob, phase, progress, dismiss, isPending } = useFetchJobWithProgress([['sources']])
  const showContent = phase === 'idle'

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    let config: Record<string, unknown> = {}
    if (type === 'RSS') config = { feedUrl }
    if (type === 'FIXTURE') config = { path: feedUrl || 'fixtures/demo-events.json' }
    if (type === 'REDDIT') config = { subreddits: subreddits.split(/[,\s]+/).filter(Boolean) }
    if (type === 'HACKER_NEWS' || type === 'GITHUB' || type === 'GDELT') config = { query }
    if (type === 'GOOGLE_NEWS') config = { query, hl, gl, maxResults: 30 }
    if (type === 'OSS_INSIGHT') {
      config = {
        period: 'past_24_hours',
        languages: languages.split(/[,\s]+/).filter(Boolean),
        keywords: keywords.split(/[,\s]+/).filter(Boolean),
        maxItems: 25,
      }
    }
    if (type === 'GITHUB_TRENDING') config = { since: 'daily', language: feedUrl || undefined }
    if (type === 'V2EX') config = { nodes: nodes.split(/[,\s]+/).filter(Boolean), limit: 20 }
    if (type === 'TELEGRAM') config = { channels: channels.split(/[,\s]+/).filter(Boolean), fetchLimit: 30 }
    if (type === 'PRODUCT_HUNT') config = { maxItems: 20 }
    if (type === 'TWITTER') config = { users: users.split(/[,\s]+/).filter(Boolean), fetchLimit: 40 }
    if (type === 'WEB') config = { url: feedUrl, extractionPrompt }
    if (type === 'EMAIL') config = { extractionPrompt, maxMessages: 15 }
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

      {showContent && open ? (
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
          {type === 'HACKER_NEWS' || type === 'GITHUB' || type === 'GDELT' || type === 'GOOGLE_NEWS' ? (
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">{t('sources.query')}</span>
              <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={query} onChange={(e) => setQuery(e.target.value)} />
            </label>
          ) : null}
          {type === 'GOOGLE_NEWS' ? (
            <>
              <label className="text-sm">
                <span className="text-muted">{t('sources.hl')}</span>
                <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={hl} onChange={(e) => setHl(e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="text-muted">{t('sources.gl')}</span>
                <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={gl} onChange={(e) => setGl(e.target.value)} />
              </label>
            </>
          ) : null}
          {type === 'OSS_INSIGHT' ? (
            <>
              <label className="text-sm">
                <span className="text-muted">{t('sources.languages')}</span>
                <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={languages} onChange={(e) => setLanguages(e.target.value)} />
              </label>
              <label className="text-sm">
                <span className="text-muted">{t('sources.keywords')}</span>
                <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
              </label>
            </>
          ) : null}
          {type === 'GITHUB_TRENDING' ? (
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">{t('sources.language')}</span>
              <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} placeholder="python / typescript / (empty=all)" />
            </label>
          ) : null}
          {type === 'V2EX' ? (
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">{t('sources.nodes')}</span>
              <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={nodes} onChange={(e) => setNodes(e.target.value)} />
            </label>
          ) : null}
          {type === 'TELEGRAM' ? (
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">{t('sources.channels')}</span>
              <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={channels} onChange={(e) => setChannels(e.target.value)} required />
            </label>
          ) : null}
          {type === 'TWITTER' ? (
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">{t('sources.users')}</span>
              <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={users} onChange={(e) => setUsers(e.target.value)} required />
            </label>
          ) : null}
          {type === 'WEB' ? (
            <>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted">{t('sources.pageUrl')}</span>
                <input className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} required />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="text-muted">{t('sources.extractionPrompt')}</span>
                <textarea className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" rows={3} value={extractionPrompt} onChange={(e) => setExtractionPrompt(e.target.value)} />
              </label>
            </>
          ) : null}
          {type === 'EMAIL' ? (
            <label className="text-sm sm:col-span-2">
              <span className="text-muted">{t('sources.extractionPrompt')}</span>
              <textarea className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2" rows={3} value={extractionPrompt} onChange={(e) => setExtractionPrompt(e.target.value)} />
            </label>
          ) : null}
          {type === 'PRODUCT_HUNT' ? (
            <p className="text-xs text-muted sm:col-span-2">{t('sources.phTokenHint')}</p>
          ) : null}
          {type === 'TWITTER' ? (
            <p className="text-xs text-muted sm:col-span-2">{t('sources.apifyTokenHint')}</p>
          ) : null}
          {type === 'EMAIL' ? (
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

      {showContent ? (
        <>
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
        </>
      ) : null}
    </div>
  )
}
