import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { Settings } from '../lib/api'
import { Button, Card, FormSaveBar, PageHeader, StateBox } from '../components/ui'
import { useSettings, useSaveSettings } from '../hooks/useSettings'
import { BasicsSection } from './settings/BasicsSection'
import { LlmSection } from './settings/LlmSection'
import { WeightsSection } from './settings/WeightsSection'
import { NotifySection } from './settings/NotifySection'
import { AdvancedSection } from './settings/AdvancedSection'

export default function SettingsPage() {
  const { t } = useTranslation()
  const settings = useSettings()
  const save = useSaveSettings()

  const [draft, setDraft] = useState<Partial<Settings> | null>(null)
  const [localToken, setLocalToken] = useState(() => localStorage.getItem('localToken') ?? '')
  const initialToken = localStorage.getItem('localToken') ?? ''
  const form = draft ?? settings.data ?? {}
  const isDirty = draft != null || localToken !== initialToken

  const patch = (p: Partial<Settings>) =>
    setDraft((prev) => ({ ...(prev ?? settings.data ?? {}), ...p }))

  const discard = () => {
    setDraft(null)
    setLocalToken(localStorage.getItem('localToken') ?? '')
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

  if (settings.isLoading) return <StateBox>{t('settings.loading')}</StateBox>
  if (settings.isError) {
    return <StateBox>{t('common.loadFailed', { message: (settings.error as Error).message })}</StateBox>
  }

  return (
    <div>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          saveSettings()
        }}
        className="grid max-w-3xl gap-4"
      >
        <BasicsSection form={form} patch={patch} />
        <LlmSection
          form={form}
          patch={patch}
          openaiConfigured={settings.data?.openaiConfigured}
          apiKeyConfigured={settings.data?.openaiApiKeyConfigured}
        />

        <Card>
          <h3 className="mb-1 font-serif text-lg">{t('settings.monitorTitle')}</h3>
          <p className="text-sm text-muted">
            {t('settings.monitorMoved')}{' '}
            <Link className="text-moss underline underline-offset-2" to="/monitor">
              {t('nav.monitor')}
            </Link>
          </p>
        </Card>

        <WeightsSection form={form} patch={patch} />
        <NotifySection
          form={form}
          patch={patch}
          smtpPasswordConfigured={settings.data?.smtpPasswordConfigured}
        />
        <AdvancedSection
          form={form}
          patch={patch}
          localToken={localToken}
          onTokenChange={setLocalToken}
          localTokenConfigured={settings.data?.localTokenConfigured}
        />

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
