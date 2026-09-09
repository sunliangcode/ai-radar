import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type Settings } from '../lib/api'
import { Button, PageHeader, StateBox } from '../components/ui'

export default function SettingsPage() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.settings })
  const [form, setForm] = useState<Partial<Settings>>({})
  const [toast, setToast] = useState<string | null>(null)
  const [packId, setPackId] = useState('ai-core')

  useEffect(() => {
    if (settings.data) setForm(settings.data)
  }, [settings.data])

  const save = useMutation({
    mutationFn: api.saveSettings,
    onSuccess: (data) => {
      qc.setQueryData(['settings'], data)
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

  function onSubmit(e: FormEvent) {
    e.preventDefault()
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
          setForm((prev) => ({
            ...prev,
            [key]: type === 'number' ? Number(e.target.value) : e.target.value,
          }))
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
                onChange={(e) => setForm((p) => ({ ...p, interestProfile: e.target.value }))}
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
                onChange={(e) => setForm((p) => ({ ...p, webhookHeaders: e.target.value }))}
                placeholder='{"Authorization":"Bearer …"}'
              />
            </label>
            {field('smtpHost', t('settings.smtpHost'))}
            {field('smtpPort', t('settings.smtpPort'), 'number')}
            {field('smtpUsername', t('settings.smtpUsername'))}
            {field('smtpFrom', t('settings.smtpFrom'))}
            {field('smtpTo', t('settings.smtpTo'))}
          </div>
          <p className="mt-3 text-xs text-muted">
            {t('settings.smtpPasswordHint', {
              status: settings.data?.smtpPasswordConfigured ? 'yes' : 'no',
            })}
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? t('common.saving') : t('common.save')}
          </Button>
          <select
            className="rounded-md border border-mist bg-paper px-3 py-2 text-sm"
            value={packId}
            onChange={(e) => setPackId(e.target.value)}
          >
            <option value="ai-core">ai-core</option>
            <option value="ai-cn">ai-cn</option>
            <option value="ai-signals">ai-signals</option>
          </select>
          <Button
            type="button"
            variant="ghost"
            disabled={importPack.isPending}
            onClick={() => importPack.mutate()}
          >
            {importPack.isPending ? t('settings.importing') : t('settings.importPack')}
          </Button>
          {toast ? <span className="text-sm text-moss">{toast}</span> : null}
        </div>
      </form>
    </div>
  )
}
