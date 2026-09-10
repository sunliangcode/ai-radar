import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api, type PreferenceKeyword, type Settings } from '../lib/api'
import { Button, FormSaveBar, PageHeader, StateBox, useToast } from '../components/ui'

export default function SettingsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.settings })
  const [draft, setDraft] = useState<Partial<Settings> | null>(null)
  const [packId, setPackId] = useState('ai-core')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [localToken, setLocalToken] = useState(() => localStorage.getItem('localToken') ?? '')
  const initialToken = localStorage.getItem('localToken') ?? ''
  const form = draft ?? settings.data ?? {}
  const isDirty = draft != null || localToken !== initialToken

  const save = useMutation({
    mutationFn: api.saveSettings,
    onSuccess: (data) => {
      qc.setQueryData(['settings'], data)
      setDraft(null)
      pushToast('success', t('settings.saved'))
    },
    onError: (e) => pushToast('error', (e as Error).message),
  })

  const discard = () => {
    setDraft(null)
    setLocalToken(localStorage.getItem('localToken') ?? '')
  }
  const importPack = useMutation({
    mutationFn: () => api.importPack({ packId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['sources'] })
      pushToast('success', t('settings.packImported'))
    },
    onError: (e) => pushToast('error', (e as Error).message),
  })

  function patchForm(patch: Partial<Settings>) {
    setDraft((prev) => ({ ...(prev ?? settings.data ?? {}), ...patch }))
  }

  function saveSettings() {
    const trimmed = localToken.trim()
    if (trimmed) {
      localStorage.setItem('localToken', trimmed)
    } else {
      localStorage.removeItem('localToken')
    }
    save.mutate({
      interestProfile: form.interestProfile,
      summaryLanguage: form.summaryLanguage,
      scoreThreshold: form.scoreThreshold,
      maxItems: form.maxItems,
      lookbackHours: form.lookbackHours,
      fetchIntervalMs: form.fetchIntervalMs,
      fetchTimeoutMs: form.fetchTimeoutMs,
      pushCron: form.pushCron,
      timezone: form.timezone,
      uiBaseUrl: form.uiBaseUrl,
      pushOnlyWhenItems: form.pushOnlyWhenItems,
      openaiBaseUrl: form.openaiBaseUrl,
      openaiModel: form.openaiModel,
      contextWindowTokens: form.contextWindowTokens,
      maxCompletionTokens: form.maxCompletionTokens,
      aiParallelism: 1,
      feishuWebhookUrl: form.feishuWebhookUrl,
      webhookUrl: form.webhookUrl,
      webhookHeaders: form.webhookHeaders,
      smtpHost: form.smtpHost,
      smtpPort: form.smtpPort,
      smtpUsername: form.smtpUsername,
      smtpFrom: form.smtpFrom,
      smtpTo: form.smtpTo,
      smtpStarttls: form.smtpStarttls,
      sourceWeights: form.sourceWeights,
    })
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    saveSettings()
  }

  const WEIGHT_KEYS = [
    'hacker_news', 'github', 'github_trending', 'oss_insight', 'zhihu',
    'reddit', 'v2ex', 'telegram', 'product_hunt', 'twitter', 'rss',
    'google_news', 'gdelt', 'web',
  ] as const
  const weights = form.sourceWeights ?? {}

  if (settings.isLoading) return <StateBox>{t('settings.loading')}</StateBox>
  if (settings.isError) {
    return <StateBox>{t('common.loadFailed', { message: (settings.error as Error).message })}</StateBox>
  }

  const field = (key: keyof Settings, label: string, type: string = 'text') => (
    <label className="block text-sm">
      <span className="text-muted">{label}</span>
      <input
        type={type}
        className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2"
        value={String(form[key] ?? '')}
        onChange={(e) =>
          patchForm({
            [key]: type === 'number' ? Number(e.target.value) : e.target.value,
          } as Partial<Settings>)
        }
      />
    </label>
  )

  return (
    <div>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <form onSubmit={onSubmit} className="grid max-w-3xl gap-4">
        <section className="rounded-xl border border-mist bg-paper/70 p-4">
          <h3 className="mb-1 font-serif text-lg">{t('settings.basicsSection')}</h3>
          <p className="mb-3 text-xs text-muted">{t('settings.interestHint')}</p>
          <p className="mb-3 text-sm">
            <Link className="text-moss underline underline-offset-2" to="/settings/context">
              {t('settings.openContexts')}
            </Link>
          </p>
          <div className="grid gap-3">
            <label className="block text-sm">
              <span className="text-muted">{t('settings.interestProfile')}</span>
              <textarea
                className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2"
                rows={3}
                value={form.interestProfile ?? ''}
                onChange={(e) => patchForm({ interestProfile: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">{t('settings.primaryLanguage')}</span>
              <select
                className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2"
                value={form.summaryLanguage === 'en' ? 'en' : 'zh'}
                onChange={(e) => patchForm({ summaryLanguage: e.target.value })}
              >
                <option value="zh">{t('settings.langZh')}</option>
                <option value="en">{t('settings.langEn')}</option>
              </select>
              <span className="mt-1 block text-xs text-muted">{t('settings.primaryLanguageHint')}</span>
            </label>
            <PreferenceKeywordsEditor />
          </div>
        </section>

        <section className="rounded-xl border border-mist bg-paper/70 p-4">
          <h3 className="mb-1 font-serif text-lg">{t('settings.llmSection')}</h3>
          <p className="mb-3 text-xs text-muted">{t('settings.llmHint')}</p>
          <p className="mb-3 text-sm text-muted">
            {t('settings.llmReadyLabel')}{' '}
            <span className="font-mono text-ink">
              {settings.data?.openaiConfigured ? t('common.yes') : t('common.no')}
            </span>
            {' · '}
            {t('settings.apiKeyConfigured')}{' '}
            <span className="font-mono text-ink">
              {settings.data?.openaiApiKeyConfigured ? t('common.yes') : t('common.no')}
            </span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {field('openaiBaseUrl', t('settings.baseUrl'))}
            {field('openaiModel', t('settings.model'))}
          </div>

          <div className="mt-4 border-t border-mist pt-4">
            <h4 className="mb-1 text-sm font-medium text-ink">{t('settings.contextSection')}</h4>
            <p className="mb-3 text-xs text-muted">{t('settings.contextWindowHint')}</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {([2048, 4096, 8192, 16384, 32768] as const).map((n) => {
                const active = Number(form.contextWindowTokens) === n
                return (
                  <button
                    key={n}
                    type="button"
                    className={`rounded-md border px-2.5 py-1 font-mono text-xs transition ${
                      active
                        ? 'border-moss bg-moss/10 text-moss'
                        : 'border-mist bg-paper text-muted hover:border-accent/50 hover:text-ink'
                    }`}
                    onClick={() => {
                      const maxComp = Math.min(
                        Number(form.maxCompletionTokens) || 1024,
                        Math.floor(n / 2),
                      )
                      patchForm({
                        contextWindowTokens: n,
                        maxCompletionTokens: Math.max(64, maxComp),
                      })
                    }}
                  >
                    {n >= 1024 ? `${n / 1024}k` : n}
                  </button>
                )
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-muted">{t('settings.contextWindow')}</span>
                <input
                  type="number"
                  min={1024}
                  max={131072}
                  step={1024}
                  className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2 font-mono"
                  value={String(form.contextWindowTokens ?? 4096)}
                  onChange={(e) => patchForm({ contextWindowTokens: Number(e.target.value) })}
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted">{t('settings.maxCompletion')}</span>
                <input
                  type="number"
                  min={64}
                  max={Math.max(64, Math.floor(Number(form.contextWindowTokens || 4096) / 2))}
                  step={64}
                  className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2 font-mono"
                  value={String(form.maxCompletionTokens ?? 1024)}
                  onChange={(e) => patchForm({ maxCompletionTokens: Number(e.target.value) })}
                />
              </label>
            </div>
            <p className="mt-2 font-mono text-xs text-muted">
              {t('settings.promptBudget', {
                budget: Math.max(
                  512,
                  Number(form.contextWindowTokens || 4096) - Number(form.maxCompletionTokens || 1024),
                ),
              })}
            </p>
            <div className="mt-4 border-t border-mist pt-4">
              <p className="text-sm text-muted">{t('settings.aiParallelism')}</p>
              <p className="mt-1 font-mono text-sm text-ink">1</p>
              <p className="mt-1 text-xs text-muted">{t('settings.aiParallelismHint')}</p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-mist bg-paper/70 p-4">
          <h3 className="mb-1 font-serif text-lg">{t('settings.monitorTitle')}</h3>
          <p className="text-sm text-muted">
            {t('settings.monitorMoved')}{' '}
            <Link className="text-moss underline underline-offset-2" to="/monitor">
              {t('nav.monitor')}
            </Link>
          </p>
        </section>

        <section className="rounded-xl border border-mist bg-paper/70 p-4">
          <h3 className="mb-1 text-base font-medium text-ink">{t('settings.weightsSection')}</h3>
          <p className="mb-3 text-xs text-muted">{t('settings.weightsHint')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {WEIGHT_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <span className="w-32 font-mono text-xs text-muted">{key}</span>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={Number(weights[key] ?? 0)}
                  onChange={(e) =>
                    patchForm({ sourceWeights: { ...weights, [key]: Number(e.target.value) } })
                  }
                  className="flex-1"
                />
                <span className="w-8 text-right font-mono text-xs text-ink">{Number(weights[key] ?? 0)}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-mist bg-paper/70 p-4">
          <h3 className="mb-3 font-serif text-lg">{t('settings.notifySection')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {field('feishuWebhookUrl', t('settings.feishuWebhook'))}
            {field('smtpTo', t('settings.smtpTo'))}
            {field('smtpHost', t('settings.smtpHost'))}
            {field('smtpFrom', t('settings.smtpFrom'))}
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(form.pushOnlyWhenItems)}
                onChange={(e) => patchForm({ pushOnlyWhenItems: e.target.checked })}
              />
              <span>{t('settings.pushOnlyWhenItems')}</span>
            </label>
          </div>
          <p className="mt-3 text-xs text-muted">
            {t('settings.smtpPasswordHint', {
              status: settings.data?.smtpPasswordConfigured ? t('common.yes') : t('common.no'),
            })}
          </p>
        </section>

        <div className="rounded-xl border border-mist bg-paper/70">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
          >
            <div>
              <h3 className="font-serif text-lg text-ink">{t('settings.advanced')}</h3>
              <p className="mt-0.5 text-xs text-muted">{t('settings.advancedHint')}</p>
            </div>
            <span className="font-mono text-sm text-muted">{advancedOpen ? '−' : '+'}</span>
          </button>

          {advancedOpen ? (
            <div className="space-y-4 border-t border-mist px-4 pb-4 pt-3">
              <section>
                <h4 className="mb-2 text-sm font-medium text-ink">{t('settings.pipelineSection')}</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {field('scoreThreshold', t('settings.scoreThreshold'), 'number')}
                  {field('maxItems', t('settings.maxItems'), 'number')}
                  {field('lookbackHours', t('settings.lookbackHours'), 'number')}
                  <label className="block text-sm">
                    <span className="text-muted">{t('settings.fetchTimeoutMs')}</span>
                    <input
                      type="number"
                      min={5000}
                      max={300000}
                      step={1000}
                      className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2 font-mono"
                      value={String(form.fetchTimeoutMs ?? 60000)}
                      onChange={(e) => patchForm({ fetchTimeoutMs: Number(e.target.value) })}
                    />
                    <span className="mt-1 block text-xs text-muted">{t('settings.fetchTimeoutHint')}</span>
                  </label>
                </div>
              </section>

              <section>
                <h4 className="mb-2 text-sm font-medium text-ink">{t('settings.scheduleSection')}</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {field('fetchIntervalMs', t('settings.fetchIntervalMs'), 'number')}
                  {field('pushCron', t('settings.pushCron'))}
                  {field('timezone', t('settings.timezone'))}
                  {field('uiBaseUrl', t('settings.uiBaseUrl'))}
                </div>
              </section>

              <section>
                <h4 className="mb-2 text-sm font-medium text-ink">{t('settings.pushSection')}</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {field('webhookUrl', t('settings.genericWebhook'))}
                  <label className="block text-sm sm:col-span-2">
                    <span className="text-muted">{t('settings.webhookHeaders')}</span>
                    <input
                      className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2 font-mono text-xs"
                      value={form.webhookHeaders ?? ''}
                      onChange={(e) => patchForm({ webhookHeaders: e.target.value })}
                      placeholder='{"Authorization":"Bearer …"}'
                    />
                  </label>
                  {field('smtpPort', t('settings.smtpPort'), 'number')}
                  {field('smtpUsername', t('settings.smtpUsername'))}
                  <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={form.smtpStarttls !== false}
                      onChange={(e) => patchForm({ smtpStarttls: e.target.checked })}
                    />
                    <span>{t('settings.smtpStarttls')}</span>
                  </label>
                </div>
              </section>

              <section>
                <h4 className="mb-2 text-sm font-medium text-ink">{t('settings.securitySection')}</h4>
                <p className="mb-3 text-sm text-muted">
                  {t('settings.localTokenServer')}{' '}
                  <span className="font-mono text-ink">
                    {settings.data?.localTokenConfigured ? t('common.yes') : t('common.no')}
                  </span>
                </p>
                <label className="block text-sm">
                  <span className="text-muted">{t('settings.localToken')}</span>
                  <input
                    type="password"
                    autoComplete="off"
                    className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2 font-mono text-sm"
                    value={localToken}
                    onChange={(e) => setLocalToken(e.target.value)}
                    placeholder={t('settings.localTokenPlaceholder')}
                  />
                </label>
                <p className="mt-2 text-xs text-muted">{t('settings.localTokenHint')}</p>
              </section>

              <section>
                <h4 className="mb-2 text-sm font-medium text-ink">{t('settings.packSection')}</h4>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    className="rounded-md border border-mist bg-paper px-3 py-2 text-sm"
                    value={packId}
                    onChange={(e) => setPackId(e.target.value)}
                    aria-label={t('settings.importPack')}
                  >
                    <option value="ai-core">{t('settings.pack.ai-core')}</option>
                    <option value="ai-cn">{t('settings.pack.ai-cn')}</option>
                    <option value="ai-signals">{t('settings.pack.ai-signals')}</option>
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    loading={importPack.isPending}
                    onClick={() => importPack.mutate()}
                  >
                    {importPack.isPending ? t('settings.importing') : t('settings.importPack')}
                  </Button>
                </div>
              </section>
            </div>
          ) : null}
        </div>

        <FormSaveBar
          dirty={isDirty}
          saving={save.isPending}
          onSave={saveSettings}
          onDiscard={discard}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" loading={save.isPending} disabled={!isDirty}>
            {save.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  )
}

function PreferenceKeywordsEditor() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { push: pushToast } = useToast()
  const [likeDraft, setLikeDraft] = useState('')
  const [dislikeDraft, setDislikeDraft] = useState('')

  const keywords = useQuery({
    queryKey: ['preference-keywords'],
    queryFn: () => api.preferenceKeywords(),
  })

  const add = useMutation({
    mutationFn: (body: { kind: 'like' | 'dislike'; text: string }) => api.addPreferenceKeyword(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['preference-keywords'] })
      pushToast('success', t('settings.keywordAdded'))
    },
    onError: (e) => pushToast('error', (e as Error).message),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.deletePreferenceKeyword(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['preference-keywords'] })
    },
    onError: (e) => pushToast('error', (e as Error).message),
  })

  const list = keywords.data?.keywords ?? []
  const likes = list.filter((k) => k.kind === 'like')
  const dislikes = list.filter((k) => k.kind === 'dislike')

  const submit = (kind: 'like' | 'dislike') => {
    const text = (kind === 'like' ? likeDraft : dislikeDraft).trim()
    if (!text) return
    add.mutate(
      { kind, text },
      {
        onSuccess: () => {
          if (kind === 'like') setLikeDraft('')
          else setDislikeDraft('')
        },
      },
    )
  }

  return (
    <div className="mt-2 space-y-4 border-t border-mist pt-4">
      <div>
        <p className="text-sm text-muted">{t('settings.likeKeywords')}</p>
        <p className="mb-2 text-xs text-faint">{t('settings.likeKeywordsHint')}</p>
        <KeywordChips keywords={likes} onRemove={(id) => remove.mutate(id)} />
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded-md border border-mist bg-paper px-3 py-1.5 text-sm"
            value={likeDraft}
            placeholder={t('settings.keywordPlaceholder')}
            onChange={(e) => setLikeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit('like')
              }
            }}
          />
          <Button type="button" variant="ghost" onClick={() => submit('like')} loading={add.isPending}>
            {t('settings.addKeyword')}
          </Button>
        </div>
      </div>
      <div>
        <p className="text-sm text-muted">{t('settings.dislikeKeywords')}</p>
        <p className="mb-2 text-xs text-faint">{t('settings.dislikeKeywordsHint')}</p>
        <KeywordChips keywords={dislikes} onRemove={(id) => remove.mutate(id)} />
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded-md border border-mist bg-paper px-3 py-1.5 text-sm"
            value={dislikeDraft}
            placeholder={t('settings.keywordPlaceholder')}
            onChange={(e) => setDislikeDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit('dislike')
              }
            }}
          />
          <Button type="button" variant="ghost" onClick={() => submit('dislike')} loading={add.isPending}>
            {t('settings.addKeyword')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function KeywordChips({
  keywords,
  onRemove,
}: {
  keywords: PreferenceKeyword[]
  onRemove: (id: number) => void
}) {
  if (keywords.length === 0) {
    return <p className="text-xs text-faint">—</p>
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {keywords.map((k) => (
        <li
          key={k.id}
          className="inline-flex max-w-full items-center gap-1 rounded-md border border-mist bg-mist/40 px-2 py-1 text-xs text-ink"
        >
          <span className="truncate" title={k.text}>
            {k.text}
          </span>
          <button
            type="button"
            className="shrink-0 text-muted hover:text-ember"
            onClick={() => onRemove(k.id)}
            aria-label="remove"
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}
