import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { Settings } from '../../lib/api'
import { api } from '../../lib/api'
import { errorText } from '../../lib/errors'
import { formatRelativeInstant } from '../../lib/format'
import { Button, Card, Field, Input, useToast } from '../../components/ui'
import { PackPicker } from '../../components/PackPicker'
import { SettingsField } from './SettingsField'

export function AdvancedSection({
  form,
  patch,
  localToken,
  onTokenChange,
  localTokenConfigured,
}: {
  form: Partial<Settings>
  patch: (patch: Partial<Settings>) => void
  localToken: string
  onTokenChange: (token: string) => void
  localTokenConfigured?: boolean
}) {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { push } = useToast()
  const cleanup = useMutation({
    mutationFn: api.cleanupJob,
    onSuccess: (body) => {
      void qc.invalidateQueries({ queryKey: ['feed'] })
      const deleted = Number(body?.deletedItems ?? 0)
      push('success', t('settings.cleanupDone', { count: deleted }))
    },
    onError: (e) => push('error', t('common.loadFailed', { message: errorText(e, t) })),
  })
  const schedule = useQuery({
    queryKey: ['jobs-schedule'],
    queryFn: api.jobsSchedule,
    enabled: open,
    retry: 1,
  })
  const nextFetch = formatRelativeInstant(schedule.data?.nextFetchAt)
  const nextPush = formatRelativeInstant(schedule.data?.nextPushAt)
  const nextFetchAbs = schedule.data?.nextFetchAt
    ? new Date(schedule.data.nextFetchAt).toLocaleString(i18n.language)
    : null
  const nextPushAbs = schedule.data?.nextPushAt
    ? new Date(schedule.data.nextPushAt).toLocaleString(i18n.language)
    : null

  return (
    <Card padding="none">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <h3 className="font-serif text-lg text-ink">{t('settings.advanced')}</h3>
          <p className="mt-0.5 text-xs text-muted">{t('settings.advancedHint')}</p>
        </div>
        <span className="font-mono text-sm text-muted">{open ? '−' : '+'}</span>
      </button>

      {open ? (
        <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">
          <section>
            <h4 className="mb-2 text-sm font-medium text-ink">{t('settings.pipelineSection')}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <SettingsField field="scoreThreshold" label={t('settings.scoreThreshold')} value={form.scoreThreshold} patch={patch} type="number" />
              <SettingsField field="maxItems" label={t('settings.maxItems')} value={form.maxItems} patch={patch} type="number" />
              <SettingsField field="lookbackHours" label={t('settings.lookbackHours')} value={form.lookbackHours} patch={patch} type="number" />
              <SettingsField
                field="fetchTimeoutMs"
                label={t('settings.fetchTimeoutMs')}
                value={form.fetchTimeoutMs ?? 60000}
                patch={patch}
                type="number"
                min={5000}
                max={300000}
                step={1000}
                hint={t('settings.fetchTimeoutHint')}
              />
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-medium text-ink">{t('settings.scheduleSection')}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <SettingsField field="fetchIntervalMs" label={t('settings.fetchIntervalMs')} value={form.fetchIntervalMs} patch={patch} type="number" />
              <SettingsField field="pushCron" label={t('settings.pushCron')} value={form.pushCron} patch={patch} />
              <SettingsField field="timezone" label={t('settings.timezone')} value={form.timezone} patch={patch} />
              <SettingsField field="uiBaseUrl" label={t('settings.uiBaseUrl')} value={form.uiBaseUrl} patch={patch} />
            </div>
            <p className="mt-2 text-xs text-muted">
              {t('settings.scheduleLiveHint')}{' '}
              {nextFetch ? (
                <span className="font-mono text-ink">
                  {t('settingsHub.healthNextFetch')}: {nextFetch}
                  {nextFetchAbs ? ` · ${nextFetchAbs}` : ''}
                </span>
              ) : null}
              {nextFetch && nextPush ? ' · ' : null}
              {nextPush ? (
                <span className="font-mono text-ink">
                  {t('settingsHub.healthNextPush')}: {nextPush}
                  {nextPushAbs ? ` · ${nextPushAbs}` : ''}
                </span>
              ) : null}
              {schedule.data?.pushCronError ? (
                <span className="text-ember"> · {schedule.data.pushCronError}</span>
              ) : null}
            </p>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-medium text-ink">{t('settings.pushSection')}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <SettingsField field="webhookUrl" label={t('settings.genericWebhook')} value={form.webhookUrl} patch={patch} />
              <Field label={t('settings.webhookHeaders')} className="sm:col-span-2">
                <Input
                  className="font-mono text-xs"
                  value={form.webhookHeaders ?? ''}
                  onChange={(e) => patch({ webhookHeaders: e.target.value })}
                  placeholder='{"Authorization":"Bearer …"}'
                />
              </Field>
              <SettingsField field="smtpPort" label={t('settings.smtpPort')} value={form.smtpPort} patch={patch} type="number" />
              <SettingsField field="smtpUsername" label={t('settings.smtpUsername')} value={form.smtpUsername} patch={patch} />
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.smtpStarttls !== false}
                  onChange={(e) => patch({ smtpStarttls: e.target.checked })}
                />
                <span>{t('settings.smtpStarttls')}</span>
              </label>
            </div>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-medium text-ink">{t('settings.maintenanceSection')}</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <SettingsField
                field="retentionDays"
                label={t('settings.retentionDays')}
                value={form.retentionDays ?? 0}
                patch={patch}
                type="number"
                min={0}
                max={3650}
                hint={t('settings.retentionDaysHint')}
              />
              <div className="flex items-end">
                <Button type="button" variant="ghost" onClick={() => cleanup.mutate()}>
                  {t('settings.runCleanup')}
                </Button>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">{t('settings.backupHint')}</p>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-medium text-ink">{t('settings.securitySection')}</h4>
            <p className="mb-3 text-sm text-muted">
              {t('settings.localTokenServer')}{' '}
              <span className="font-mono text-ink">
                {localTokenConfigured ? t('common.yes') : t('common.no')}
              </span>
            </p>
            <Field label={t('settings.localToken')}>
              <Input
                type="password"
                autoComplete="off"
                className="font-mono text-sm"
                value={localToken}
                onChange={(e) => onTokenChange(e.target.value)}
                placeholder={t('settings.localTokenPlaceholder')}
              />
            </Field>
            <p className="mt-2 text-xs text-muted">{t('settings.localTokenHint')}</p>
          </section>

          <section>
            <h4 className="mb-2 text-sm font-medium text-ink">{t('settings.packSection')}</h4>
            <PackPicker
              buttonLabel={t('settings.importPack')}
              variant="ghost"
              invalidate={[['settings'], ['sources']]}
            />
          </section>
        </div>
      ) : null}
    </Card>
  )
}
