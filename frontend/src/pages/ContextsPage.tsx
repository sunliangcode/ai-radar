import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type UserContext } from '../lib/api'
import { SettingsSection } from '../components/SettingsSection'
import { SourcesSection } from '../components/SourcesSection'
import { Button, PageHeader, StateBox } from '../components/ui'

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
  const ctx = useQuery({ queryKey: ['contexts'], queryFn: api.getContext })
  const [payload, setPayload] = useState<UserContext['payload'] | null>(null)
  const [rawText, setRawText] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (ctx.data?.payload) {
      setPayload(ctx.data.payload)
      setRawText(ctx.data.rawText ?? '')
    }
  }, [ctx.data])

  const save = useMutation({
    mutationFn: () => api.saveContext({ payload, rawText, source: 'manual' }),
    onSuccess: (data) => {
      qc.setQueryData(['contexts'], data)
      setToast(t('contexts.saved'))
      setTimeout(() => setToast(null), 2000)
    },
    onError: (e) => setToast((e as Error).message),
  })

  const extract = useMutation({
    mutationFn: () => api.extractContext(rawText),
    onSuccess: (draft) => {
      setPayload(draft.payload)
      setToast(t('contexts.extracted'))
      setTimeout(() => setToast(null), 2000)
    },
    onError: (e) => setToast((e as Error).message),
  })

  const importGithub = useMutation({
    mutationFn: () => api.importGithubContext(githubUrl),
    onSuccess: (draft) => {
      setPayload(draft.payload)
      if (draft.rawText) setRawText(draft.rawText)
      setToast(t('contexts.imported'))
      setTimeout(() => setToast(null), 2000)
    },
    onError: (e) => setToast((e as Error).message),
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    save.mutate()
  }

  if (ctx.isLoading) return <StateBox>{t('contexts.loading')}</StateBox>
  if (ctx.isError) {
    return <StateBox>{t('common.loadFailed', { message: (ctx.error as Error).message })}</StateBox>
  }
  if (!payload) return <StateBox>{t('contexts.loading')}</StateBox>

  return (
    <div className="space-y-10">
      <PageHeader title={t('contexts.title')} subtitle={t('contexts.subtitle')} />
      {toast ? (
        <p className="text-sm text-moss" role="status">
          {toast}
        </p>
      ) : null}

      <form className="space-y-6" onSubmit={onSubmit}>
        <section>
          <h3 className="mb-3 font-serif text-lg text-ink">{t('contexts.whoSection')}</h3>
          <div className="space-y-4 rounded-xl border border-mist bg-paper/70 p-4">
            <div>
              <h4 className="mb-2 text-sm font-medium text-ink">{t('contexts.extractTitle')}</h4>
              <textarea
                className="min-h-28 w-full rounded-md border border-mist bg-paper px-3 py-2 text-sm"
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
                  className="min-w-64 flex-1 rounded-md border border-mist bg-paper px-3 py-2 text-sm"
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

            <div className="grid gap-4 border-t border-mist pt-4 md:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block text-muted">{t('contexts.role')}</span>
                <input
                  className="w-full rounded-md border border-mist bg-paper px-3 py-2"
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
                  className="w-full rounded-md border border-mist bg-paper px-3 py-2"
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
                  className="w-full rounded-md border border-mist bg-paper px-3 py-2"
                  value={listToText(payload.technologies)}
                  onChange={(e) => setPayload({ ...payload, technologies: textToList(e.target.value) })}
                />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-muted">{t('contexts.interests')}</span>
                <input
                  className="w-full rounded-md border border-mist bg-paper px-3 py-2"
                  value={listToText(payload.interests)}
                  onChange={(e) => setPayload({ ...payload, interests: textToList(e.target.value) })}
                />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-muted">{t('contexts.goals')}</span>
                <input
                  className="w-full rounded-md border border-mist bg-paper px-3 py-2"
                  value={listToText(payload.goals)}
                  onChange={(e) => setPayload({ ...payload, goals: textToList(e.target.value) })}
                />
              </label>
              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-muted">{t('contexts.projects')}</span>
                <textarea
                  className="min-h-24 w-full rounded-md border border-mist bg-paper px-3 py-2 text-sm"
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

            <Button type="submit" loading={save.isPending}>
              {save.isPending ? t('common.saving') : t('contexts.confirmSave')}
            </Button>
          </div>
        </section>
      </form>

      <SourcesSection />
      <SettingsSection />
    </div>
  )
}
