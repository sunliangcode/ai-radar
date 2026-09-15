import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Settings } from '../lib/api'
import { Button, FormSaveBar, PageHeader, StateBox } from '../components/ui'
import { useSettings, useSaveSettings } from '../hooks/useSettings'
import { BasicsSection } from './settings/BasicsSection'
import { NotifySection } from './settings/NotifySection'
import { errorText } from '../lib/errors'

/** Customer preferences: interests + notifications only. Ops knobs live in .env. */
export default function SettingsPage() {
  const { t } = useTranslation()
  const settings = useSettings()
  const save = useSaveSettings()

  const [draft, setDraft] = useState<Partial<Settings> | null>(null)
  const form = draft ?? settings.data ?? {}
  const isDirty = draft != null

  const patch = (p: Partial<Settings>) =>
    setDraft((prev) => ({ ...(prev ?? settings.data ?? {}), ...p }))

  const discard = () => setDraft(null)

  function saveSettings() {
    save.mutate(
      {
        interestProfile: form.interestProfile,
        summaryLanguage: form.summaryLanguage,
        pushCron: form.pushCron,
        timezone: form.timezone,
        pushOnlyWhenItems: form.pushOnlyWhenItems,
        smtpTo: form.smtpTo,
      },
      {
        onSuccess: () => setDraft(null),
      },
    )
  }

  if (settings.isLoading) return <StateBox>{t('settings.loading')}</StateBox>
  if (settings.isError) {
    return <StateBox>{t('common.loadFailed', { message: errorText(settings.error, t) })}</StateBox>
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
        <NotifySection
          form={form}
          patch={patch}
          emailTransportReady={settings.data?.emailTransportReady}
          feishuBound={settings.data?.feishuBound}
        />

        <FormSaveBar
          dirty={isDirty}
          saving={save.isPending}
          onDiscard={discard}
          onSave={saveSettings}
        />
        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending} disabled={!isDirty}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  )
}
