import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type UserContext } from '../lib/api'
import { Button, FormSaveBar, PageHeader, StateBox, useToast } from '../components/ui'

function listToText(values?: string[]) {
  return (values ?? []).join(', ')
}

function textToList(value: string) {
  return value
    .split(/[,，、\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function ContextsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const ctx = useQuery({ queryKey: ['contexts'], queryFn: api.getContext })
  const [payload, setPayload] = useState<UserContext['payload'] | null>(null)
  const [rawText, setRawText] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [baseline, setBaseline] = useState<string | null>(null)
  const hydratedRef = useRef(false)
  const currentKey = useMemo(
    () => JSON.stringify({ payload, rawText }),
    [payload, rawText],
  )
  const isDirty = baseline != null && currentKey !== baseline

  useEffect(() => {
    if (!ctx.data?.payload || hydratedRef.current) return
    setPayload(ctx.data.payload)
    setRawText(ctx.data.rawText ?? '')
    setBaseline(JSON.stringify({ payload: ctx.data.payload, rawText: ctx.data.rawText ?? '' }))
    hydratedRef.current = true
  }, [ctx.data])

  const save = useMutation({
    mutationFn: () => api.saveContext({ payload, rawText, source: 'manual' }),
    onSuccess: (data) => {
      qc.setQueryData(['contexts'], data)
      setBaseline(JSON.stringify({ payload, rawText }))
      pushToast('success', t('contexts.saved'))
    },
    onError: (e) => pushToast('error', (e as Error).message),
  })

  const extract = useMutation({
    mutationFn: () => api.extractContext(rawText),
    onSuccess: (draft) => {
      setPayload(draft.payload)
      pushToast('success', t('contexts.extracted'))
    },
    onError: (e) => pushToast('error', (e as Error).message),
  })

  const importGithub = useMutation({
    mutationFn: () => api.importGithubContext(githubUrl),
    onSuccess: (draft) => {
      setPayload(draft.payload)
      if (draft.rawText) setRawText(draft.rawText)
      pushToast('success', t('contexts.imported'))
    },
    onError: (e) => pushToast('error', (e as Error).message),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  function discard() {
    if (baseline == null) return
    const parsed = JSON.parse(baseline) as { payload: UserContext['payload']; rawText: string }
    setPayload(parsed.payload)
    setRawText(parsed.rawText)
  }

  if (ctx.isLoading) return <StateBox>{t('contexts.loading')}</StateBox>
  if (ctx.isError) {
    return <StateBox>{t('common.loadFailed', { message: (ctx.error as Error).message })}</StateBox>
  }
  if (!payload) return <StateBox>{t('contexts.loading')}</StateBox>

  return (
    <div className="space-y-10">
      <PageHeader title={t('contexts.title')} subtitle={t('contexts.subtitle')} />

      <form className="space-y-6" onSubmit={onSubmit}>
        <section>
          <h3 className="mb-3 font-serif text-lg text-ink">{t('contexts.whoSection')}</h3>
          <div className="space-y-4 rounded-xl border border-border bg-surface/70 p-4">
            <div>
              <h4 className="mb-2 text-sm font-medium text-ink">{t('contexts.extractTitle')}</h4>
              <textarea
                className="min-h-28 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={t('contexts.extractPlaceholder')}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="ghost" loading={extract.isPending} onClick={() => extract.mutate()}>
                  {t('contexts.extract')}
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <input
                  className="min-w-64 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo"
                />
                <Button
                  type="button"
                  variant="ghost"
                  loading={importGithub.isPending}
                  onClick={() => importGithub.mutate()}
                >
                  {t('contexts.importGithub')}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-muted">{t('contexts.role')}</span>
                <input
                  className="w-full rounded-md border border-border bg-surface px-3 py-2"
                  value={payload.profile?.role ?? ''}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      profile: { ...payload.profile, role: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-muted">{t('contexts.summary')}</span>
                <input
                  className="w-full rounded-md border border-border bg-surface px-3 py-2"
                  value={payload.profile?.summary ?? ''}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      profile: { ...payload.profile, summary: e.target.value },
                    })
                  }
                />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-muted">{t('contexts.technologies')}</span>
                <input
                  className="w-full rounded-md border border-border bg-surface px-3 py-2"
                  value={listToText(payload.technologies)}
                  onChange={(e) => setPayload({ ...payload, technologies: textToList(e.target.value) })}
                />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-muted">{t('contexts.interests')}</span>
                <input
                  className="w-full rounded-md border border-border bg-surface px-3 py-2"
                  value={listToText(payload.interests)}
                  onChange={(e) => setPayload({ ...payload, interests: textToList(e.target.value) })}
                />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-muted">{t('contexts.goals')}</span>
                <input
                  className="w-full rounded-md border border-border bg-surface px-3 py-2"
                  value={listToText(payload.goals)}
                  onChange={(e) => setPayload({ ...payload, goals: textToList(e.target.value) })}
                />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-muted">{t('contexts.projects')}</span>
                <textarea
                  className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm"
                  value={(payload.projects ?? [])
                    .map((p) => `${p.name ?? ''}${p.stack?.length ? ` [${p.stack.join(', ')}]` : ''}`)
                    .join('\n')}
                  onChange={(e) =>
                    setPayload({
                      ...payload,
                      projects: e.target.value
                        .split('\n')
                        .map((line) => line.trim())
                        .filter(Boolean)
                        .map((line) => {
                          const m = line.match(/^(.*?)(?:\s*\[(.*)\])?$/)
                          return {
                            name: (m?.[1] ?? line).trim(),
                            stack: m?.[2] ? textToList(m[2]) : [],
                            type: 'project',
                          }
                        }),
                    })
                  }
                />
              </label>
            </div>

            <FormSaveBar
              dirty={isDirty}
              saving={save.isPending}
              onSave={() => save.mutate()}
              onDiscard={discard}
            />
            <Button type="submit" loading={save.isPending} disabled={!isDirty}>
              {save.isPending ? t('common.saving') : t('contexts.confirmSave')}
            </Button>
          </div>
        </section>
      </form>
    </div>
  )
}
