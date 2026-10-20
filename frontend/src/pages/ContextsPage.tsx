import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type Settings, type UserContext } from '../lib/api'
import { Button, Field, FormSaveBar, Input, ListSkeleton, PageHeader, QueryErrorState, Textarea, useToast } from '../components/ui'
import { errorText } from '../lib/errors'
import { prefersReducedMotion } from '../lib/a11y'
import { useEscapeBack } from '../hooks/useEscapeBack'
import { useSaveSettings, useSettings } from '../hooks/useSettings'
import { BasicsSection } from './settings/BasicsSection'
import { NotifySection } from './settings/NotifySection'
import { cn, focusRingClass } from '../lib/cn'

function listToText(values?: string[]) {
  return (values ?? []).join(', ')
}

function textToList(value: string) {
  return value
    .split(/[,，、\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function isSparsePayload(payload: UserContext['payload'] | null) {
  if (!payload) return true
  const role = payload.profile?.role?.trim()
  const tech = payload.technologies?.length ?? 0
  const focus = payload.current_focus?.length ?? 0
  const interests = payload.interests?.length ?? 0
  return !role && tech === 0 && focus === 0 && interests === 0
}

export default function ContextsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const ctx = useQuery({ queryKey: ['contexts'], queryFn: api.getContext })
  const settings = useSettings()
  const saveSettings = useSaveSettings()
  const [settingsDraft, setSettingsDraft] = useState<Partial<Settings> | null>(null)
  const settingsForm = settingsDraft ?? settings.data ?? {}
  const settingsDirty = settingsDraft != null
  const [payload, setPayload] = useState<UserContext['payload'] | null>(null)
  const [rawText, setRawText] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [baseline, setBaseline] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const hydratedRef = useRef(false)
  const understoodRef = useRef<HTMLHeadingElement>(null)
  const currentKey = useMemo(
    () => JSON.stringify({ payload, rawText }),
    [payload, rawText],
  )
  const isDirty = baseline != null && currentKey !== baseline

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/settings')
  }, [navigate])
  useEscapeBack(goBack, !isDirty && !settingsDirty)

  useEffect(() => {
    if (!payload || !settings.data || settings.isError) return
    if (window.location.hash !== '#notify') return
    const el = document.getElementById('notify')
    if (!el) return
    const reduce = prefersReducedMotion()
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    document.getElementById('notify-heading')?.focus({ preventScroll: true })
  }, [payload, settings.data, settings.isError])

  const patchSettings = (p: Partial<Settings>) =>
    setSettingsDraft((prev) => ({ ...(prev ?? settings.data ?? {}), ...p }))

  function discardSettings() {
    setSettingsDraft(null)
  }

  function submitSettings() {
    saveSettings.mutate(
      {
        summaryLanguage: settingsForm.summaryLanguage,
        pushCron: settingsForm.pushCron,
        timezone: settingsForm.timezone,
        pushOnlyWhenItems: settingsForm.pushOnlyWhenItems,
        smtpTo: settingsForm.smtpTo,
      },
      {
        onSuccess: () => {
          setSettingsDraft(null)
          queueMicrotask(() =>
            document.getElementById('settings-basics-heading')?.focus({ preventScroll: true }),
          )
        },
      },
    )
  }

  useEffect(() => {
    if (!ctx.data?.payload || hydratedRef.current) return
    setPayload(ctx.data.payload)
    setRawText(ctx.data.rawText ?? '')
    setBaseline(JSON.stringify({ payload: ctx.data.payload, rawText: ctx.data.rawText ?? '' }))
    hydratedRef.current = true
  }, [ctx.data])

  const save = useMutation({
    mutationFn: async () => {
      let nextPayload = payload
      let source = 'manual'
      if (rawText.trim() && isSparsePayload(payload)) {
        const draft = await api.extractContext(rawText)
        nextPayload = draft.payload
        source = 'extract'
        setPayload(draft.payload)
      }
      return api.saveContext({ payload: nextPayload, rawText, source })
    },
    onSuccess: (data) => {
      qc.setQueryData(['contexts'], data)
      setPayload(data.payload)
      setRawText(data.rawText ?? rawText)
      setBaseline(JSON.stringify({ payload: data.payload, rawText: data.rawText ?? rawText }))
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      void qc.invalidateQueries({ queryKey: ['changes'] })
      void qc.invalidateQueries({ queryKey: ['changes-list'] })
      pushToast('success', t('contexts.saved'), {
        label: t('contexts.refreshToday'),
        onClick: () => {
          void api
            .impactJob()
            .then(() => {
              void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
              void qc.invalidateQueries({ queryKey: ['changes'] })
              navigate('/')
            })
            .catch(() => navigate('/'))
        },
      })
      queueMicrotask(() =>
        document.getElementById('contexts-page-heading')?.focus({ preventScroll: true }),
      )
    },
    onError: (e) => pushToast('error', errorText(e, t)),
  })

  const extract = useMutation({
    mutationFn: () => api.extractContext(rawText),
    onSuccess: (draft) => {
      setPayload(draft.payload)
      pushToast('success', t('contexts.extracted'))
      const reduce = prefersReducedMotion()
      window.requestAnimationFrame(() => {
        understoodRef.current?.focus({ preventScroll: true })
        understoodRef.current?.scrollIntoView({
          block: 'nearest',
          behavior: reduce ? 'auto' : 'smooth',
        })
      })
    },
    onError: (e) => pushToast('error', errorText(e, t)),
  })

  const importGithub = useMutation({
    mutationFn: () => api.importGithubContext(githubUrl),
    onSuccess: (draft) => {
      setPayload(draft.payload)
      if (draft.rawText) setRawText(draft.rawText)
      setAdvancedOpen(true)
      pushToast('success', t('contexts.imported'))
      const reduce = prefersReducedMotion()
      window.requestAnimationFrame(() => {
        understoodRef.current?.focus({ preventScroll: true })
        understoodRef.current?.scrollIntoView({
          block: 'nearest',
          behavior: reduce ? 'auto' : 'smooth',
        })
      })
    },
    onError: (e) => pushToast('error', errorText(e, t)),
  })

  function discard() {
    if (baseline == null) return
    const parsed = JSON.parse(baseline) as { payload: UserContext['payload']; rawText: string }
    setPayload(parsed.payload)
    setRawText(parsed.rawText)
  }

  if (ctx.isLoading) return <ListSkeleton rows={4} />
  if (ctx.isError) {
    return (
      <QueryErrorState
        message={t('common.loadFailed', { message: errorText(ctx.error, t) })}
        onRetry={() => void ctx.refetch()}
      />
    )
  }
  if (!payload) return <ListSkeleton rows={4} />

  return (
    <div className="space-y-10">
      <PageHeader
        titleId="contexts-page-heading"
        title={t('contexts.title')}
        subtitle={t('contexts.subtitle')}
        back={{ label: t('common.backToList'), onClick: goBack }}
      />

      <div
        className="space-y-6"
        aria-labelledby="contexts-page-heading"
        aria-busy={save.isPending || extract.isPending || importGithub.isPending || undefined}
      >
        <section aria-labelledby="context-intro-heading">
          <div className="space-y-4 rounded-xl border border-border bg-surface/70 p-4">
            <div>
              <h3 id="context-intro-heading" className="mb-1 font-serif text-lg text-ink">
                {t('contexts.introTitle')}
              </h3>
              <p id="context-intro-hint" className="mb-3 text-sm text-muted">
                {t('contexts.introHint')}
              </p>
              <Textarea
                className="min-h-28"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={t('contexts.extractPlaceholder')}
                aria-label={t('contexts.introTitle')}
                aria-describedby="context-intro-hint"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  loading={extract.isPending}
                  disabled={!rawText.trim() || extract.isPending}
                  aria-label={t('contexts.extract')}
                  onClick={() => extract.mutate()}
                >
                  {t('contexts.extract')}
                </Button>
              </div>
            </div>

            <div className="border-t border-border pt-4" aria-labelledby="context-understood-heading">
              <h4
                id="context-understood-heading"
                ref={understoodRef}
                tabIndex={-1}
                className="mb-1 text-sm font-medium text-ink outline-none"
              >
                {t('contexts.understoodTitle')}
              </h4>
              <p className="mb-3 text-xs text-muted">{t('contexts.understoodHint')}</p>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={t('contexts.role')}>
                  <Input
                    value={payload.profile?.role ?? ''}
                    onChange={(e) =>
                      setPayload({
                        ...payload,
                        profile: { ...payload.profile, role: e.target.value },
                      })
                    }
                  />
                </Field>
                <Field label={t('contexts.technologies')} className="md:col-span-2">
                  <Input
                    value={listToText(payload.technologies)}
                    onChange={(e) => setPayload({ ...payload, technologies: textToList(e.target.value) })}
                  />
                </Field>
                <Field label={t('contexts.currentFocus')} className="md:col-span-2">
                  <Input
                    value={listToText(payload.current_focus)}
                    onChange={(e) =>
                      setPayload({ ...payload, current_focus: textToList(e.target.value), schemaVersion: 2 })
                    }
                  />
                </Field>
                <Field label={t('contexts.explicitIgnore')} className="md:col-span-2">
                  <Input
                    value={listToText(payload.explicit_ignore)}
                    onChange={(e) =>
                      setPayload({ ...payload, explicit_ignore: textToList(e.target.value), schemaVersion: 2 })
                    }
                  />
                </Field>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <button
                type="button"
                className={cn(
                  'inline-flex min-h-9 items-center rounded-sm text-sm text-accent hover:underline',
                  focusRingClass(),
                )}
                onClick={() => setAdvancedOpen((o) => !o)}
                aria-expanded={advancedOpen}
                aria-controls="context-advanced-fields"
                aria-label={advancedOpen ? t('contexts.hideMore') : t('contexts.showMore')}
              >
                {advancedOpen ? t('contexts.hideMore') : t('contexts.showMore')}
              </button>
              {advancedOpen ? (
                <div id="context-advanced-fields" className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label={t('contexts.summary')} className="md:col-span-2">
                    <Input
                      value={payload.profile?.summary ?? ''}
                      onChange={(e) =>
                        setPayload({
                          ...payload,
                          profile: { ...payload.profile, summary: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <Field label={t('contexts.interests')} className="md:col-span-2">
                    <Input
                      value={listToText(payload.interests)}
                      onChange={(e) => setPayload({ ...payload, interests: textToList(e.target.value) })}
                    />
                  </Field>
                  <Field label={t('contexts.goals')} className="md:col-span-2">
                    <Input
                      value={listToText(payload.goals)}
                      onChange={(e) => setPayload({ ...payload, goals: textToList(e.target.value) })}
                    />
                  </Field>
                  <Field label={t('contexts.projects')} className="md:col-span-2">
                    <Textarea
                      className="min-h-24"
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
                  </Field>
                  <div className="flex flex-wrap items-center gap-2 md:col-span-2">
                    <Input
                      className="min-w-64 flex-1"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      placeholder="https://github.com/owner/repo"
                      aria-label={t('contexts.importGithub')}
                      disabled={importGithub.isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      loading={importGithub.isPending}
                      disabled={!githubUrl.trim() || importGithub.isPending}
                      aria-label={t('contexts.importGithub')}
                      onClick={() => importGithub.mutate()}
                    >
                      {t('contexts.importGithub')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <FormSaveBar
              dirty={isDirty}
              saving={save.isPending || extract.isPending}
              onSave={() => save.mutate()}
              onDiscard={discard}
            />
          </div>
        </section>

        {settings.isLoading ? (
          <ListSkeleton rows={2} />
        ) : settings.isError ? (
          <QueryErrorState
            message={t('common.loadFailed', { message: errorText(settings.error, t) })}
            onRetry={() => void settings.refetch()}
          />
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitSettings()
            }}
            aria-labelledby="settings-basics-heading"
            aria-busy={saveSettings.isPending || undefined}
            className="grid max-w-3xl gap-4"
          >
            <BasicsSection form={settingsForm} patch={patchSettings} />
            <NotifySection
              form={settingsForm}
              patch={patchSettings}
              emailTransportReady={settings.data?.emailTransportReady}
              feishuBound={settings.data?.feishuBound}
            />
            <FormSaveBar
              dirty={settingsDirty}
              saving={saveSettings.isPending}
              onDiscard={discardSettings}
              onSave={submitSettings}
            />
          </form>
        )}
      </div>
    </div>
  )
}
