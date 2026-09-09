import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type Settings } from '../lib/api'
import { Button, PageHeader, StateBox } from '../components/ui'

export default function SettingsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.settings })
  const [draft, setDraft] = useState<Partial<Settings> | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [packId, setPackId] = useState('ai-core')
  const [localToken, setLocalToken] = useState(() => localStorage.getItem('localToken') ?? '')
  const form = draft ?? settings.data ?? {}

  const save = useMutation({
    mutationFn: api.saveSettings,
    onSuccess: (data) => {
      qc.setQueryData(['settings'], data)
      setDraft(null)
      setToast(t('settings.saved'))
      setTimeout(() => setToast(null), 2000)
    },
    onError: (e) => setToast((e as Error).message),
  })
  const importPack = useMutation({
    mutationFn: () => api.importPack({ packId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['sources'] })
      setToast(t('settings.packImported'))
      setTimeout(() => setToast(null), 2000)
    },
    onError: (e) => setToast((e as Error).message),
  })

  function patchForm(patch: Partial<Settings>) {
    setDraft((prev) => ({ ...(prev ?? settings.data ?? {}), ...patch }))
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
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
      pushCron: form.pushCron,
      timezone: form.timezone,
      uiBaseUrl: form.uiBaseUrl,
      pushOnlyWhenItems: form.pushOnlyWhenItems,
      openaiBaseUrl: form.openaiBaseUrl,
      openaiModel: form.openaiModel,
      feishuWebhookUrl: form.feishuWebhookUrl,
      webhookUrl: form.webhookUrl,
      webhookHeaders: form.webhookHeaders,
      smtpHost: form.smtpHost,
      smtpPort: form.smtpPort,
      smtpUsername: form.smtpUsername,
      smtpFrom: form.smtpFrom,
      smtpTo: form.smtpTo,
      smtpStarttls: form.smtpStarttls,
    })
  }

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
          <h3 className="mb-3 font-serif text-lg">{t('settings.interestSection')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="text-muted">{t('settings.interestProfile')}</span>
              <textarea
                className="mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2"
                rows={3}
                value={form.interestProfile ?? ''}
                onChange={(e) => patchForm({ interestProfile: e.target.value })}
              />
            </label>
            {field('scoreThreshold', t('settings.scoreThreshold'), 'number')}
            {field('maxItems', t('settings.maxItems'), 'number')}
            {field('lookbackHours', t('settings.lookbackHours'), 'number')}
            {field('summaryLanguage', t('settings.summaryLanguage'))}
          </div>
        </section>

        <section className="rounded-xl border border-mist bg-paper/70 p-4">
          <h3 className="mb-3 font-serif text-lg">{t('settings.llmSection')}</h3>
          <p className="mb-3 text-sm text-muted">
            {t('settings.apiKeyConfigured')}{' '}
            <span className="font-mono text-ink">
              {settings.data?.openaiConfigured ? t('settings.apiKeyYes') : t('settings.apiKeyNo')}
            </span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {field('openaiBaseUrl', t('settings.baseUrl'))}
            {field('openaiModel', t('settings.model'))}
          </div>
        </section>

        <section className="rounded-xl border border-mist bg-paper/70 p-4">
          <h3 className="mb-3 font-serif text-lg">{t('settings.scheduleSection')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {field('fetchIntervalMs', t('settings.fetchIntervalMs'), 'number')}
            {field('pushCron', t('settings.pushCron'))}
            {field('timezone', t('settings.timezone'))}
            {field('uiBaseUrl', t('settings.uiBaseUrl'))}
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={Boolean(form.pushOnlyWhenItems)}
                onChange={(e) => patchForm({ pushOnlyWhenItems: e.target.checked })}
              />
              <span>{t('settings.pushOnlyWhenItems')}</span>
            </label>
          </div>
        </section>

        <section className="rounded-xl border border-mist bg-paper/70 p-4">
          <h3 className="mb-3 font-serif text-lg">{t('settings.pushSection')}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {field('feishuWebhookUrl', t('settings.feishuWebhook'))}
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
            {field('smtpHost', t('settings.smtpHost'))}
            {field('smtpPort', t('settings.smtpPort'), 'number')}
            {field('smtpUsername', t('settings.smtpUsername'))}
            {field('smtpFrom', t('settings.smtpFrom'))}
            {field('smtpTo', t('settings.smtpTo'))}
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={form.smtpStarttls !== false}
                onChange={(e) => patchForm({ smtpStarttls: e.target.checked })}
              />
              <span>{t('settings.smtpStarttls')}</span>
            </label>
          </div>
          <p className="mt-3 text-xs text-muted">
            {t('settings.smtpPasswordHint', {
              status: settings.data?.smtpPasswordConfigured ? t('common.yes') : t('common.no'),
            })}
          </p>
        </section>

        <section className="rounded-xl border border-mist bg-paper/70 p-4">
          <h3 className="mb-3 font-serif text-lg">{t('settings.securitySection')}</h3>
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

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? t('common.saving') : t('common.save')}
          </Button>
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
            disabled={importPack.isPending}
            onClick={() => importPack.mutate()}
          >
            {importPack.isPending ? t('settings.importing') : t('settings.importPack')}
          </Button>
          {toast ? (
            <span className="text-sm text-moss" role="status">
              {toast}
            </span>
          ) : null}
        </div>
      </form>
    </div>
  )
}
