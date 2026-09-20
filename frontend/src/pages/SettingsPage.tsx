import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Settings } from '../lib/api'
import { FormSaveBar, ListSkeleton, PageHeader, QueryErrorState } from '../components/ui'
import { useSettings, useSaveSettings } from '../hooks/useSettings'
import { BasicsSection } from './settings/BasicsSection'
import { NotifySection } from './settings/NotifySection'
import { errorText } from '../lib/errors'

/** Notifications + summary language. Personalization lives in Context. */
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

  useEffect(() => {
    if (settings.isLoading || settings.isError) return
    if (window.location.hash !== '#notify') return
    const el = document.getElementById('notify')
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }, [settings.isLoading, settings.isError])

  function saveSettings() {
    save.mutate(
      {
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

  if (settings.isLoading) return <ListSkeleton rows={4} />
  if (settings.isError) {
    return (
      <QueryErrorState
        message={t('common.loadFailed', { message: errorText(settings.error, t) })}
        onRetry={() => void settings.refetch()}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
        back={{ label: t('common.backToList'), to: '/settings' }}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault()
          saveSettings()
        }}
        aria-label={t('settings.title')}
        aria-busy={save.isPending || undefined}
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
      </form>
    </div>
  )
}
