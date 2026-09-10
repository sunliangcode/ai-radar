import { useTranslation } from 'react-i18next'
import type { Settings } from '../../lib/api'
import { Card } from '../../components/ui'
import { SettingsField } from './SettingsField'

export function NotifySection({
  form,
  patch,
  smtpPasswordConfigured,
}: {
  form: Partial<Settings>
  patch: (patch: Partial<Settings>) => void
  smtpPasswordConfigured?: boolean
}) {
  const { t } = useTranslation()
  return (
    <Card>
      <h3 className="mb-3 font-serif text-lg">{t('settings.notifySection')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <SettingsField field="feishuWebhookUrl" label={t('settings.feishuWebhook')} value={form.feishuWebhookUrl} patch={patch} />
        <SettingsField field="smtpTo" label={t('settings.smtpTo')} value={form.smtpTo} patch={patch} />
        <SettingsField field="smtpHost" label={t('settings.smtpHost')} value={form.smtpHost} patch={patch} />
        <SettingsField field="smtpFrom" label={t('settings.smtpFrom')} value={form.smtpFrom} patch={patch} />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={Boolean(form.pushOnlyWhenItems)}
            onChange={(e) => patch({ pushOnlyWhenItems: e.target.checked })}
          />
          <span>{t('settings.pushOnlyWhenItems')}</span>
        </label>
      </div>
      <p className="mt-3 text-xs text-muted">
        {t('settings.smtpPasswordHint', {
          status: smtpPasswordConfigured ? t('common.yes') : t('common.no'),
        })}
      </p>
    </Card>
  )
}
