import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, type Settings } from '../../lib/api'
import { errorText } from '../../lib/errors'
import { formatPushResult, type PushResultBody } from '../../lib/formatPushResult'
import { Button, Card, useToast } from '../../components/ui'
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
  const qc = useQueryClient()
  const { push } = useToast()
  const pushNow = useMutation({
    mutationFn: api.pushJob,
    onSuccess: (body) => {
      void qc.invalidateQueries({ queryKey: ['jobs-schedule'] })
      const result = body as PushResultBody
      const failed = (result.results ?? []).some((r) => r.success === false && !r.skipped)
      push(failed ? 'error' : 'success', formatPushResult(result, t))
    },
    onError: (e) => push('error', t('common.loadFailed', { message: errorText(e, t) })),
  })

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-serif text-lg">{t('settings.notifySection')}</h3>
        <Button type="button" variant="ghost" loading={pushNow.isPending} onClick={() => pushNow.mutate()}>
          {pushNow.isPending ? t('common.pushing') : t('common.pushNow')}
        </Button>
      </div>
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
