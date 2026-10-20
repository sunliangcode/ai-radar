import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type Settings } from '../../lib/api'
import { errorText } from '../../lib/errors'
import { Button, Card, ConfirmDialog, Field, Input, useToast } from '../../components/ui'

export function MaintenanceSection({
  form,
  patch,
}: {
  form: Partial<Settings>
  patch: (patch: Partial<Settings>) => void
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { push } = useToast()
  const [confirmCleanup, setConfirmCleanup] = useState(false)
  const [confirmDedup, setConfirmDedup] = useState(false)
  const days = form.retentionDays ?? 0

  const invalidateFeed = () => {
    void qc.invalidateQueries({ queryKey: ['feed'] })
    void qc.invalidateQueries({ queryKey: ['unread-counts'] })
    void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
    void qc.invalidateQueries({ queryKey: ['items'] })
    void qc.invalidateQueries({ queryKey: ['changes'] })
  }

  const cleanup = useMutation({
    mutationFn: api.cleanupJob,
    onSuccess: (body) => {
      setConfirmCleanup(false)
      const count = typeof body.deletedItems === 'number' ? body.deletedItems : 0
      const enabled = body.enabled !== false && days > 0
      push(
        'success',
        enabled
          ? t('settings.cleanupDone', { count })
          : t('settings.cleanupDisabled'),
      )
      invalidateFeed()
    },
    onError: (e) => push('error', t('common.loadFailed', { message: errorText(e, t) })),
  })

  const dedup = useMutation({
    mutationFn: api.cleanupDuplicateTitlesJob,
    onSuccess: (body) => {
      setConfirmDedup(false)
      const deleted = typeof body.deletedItems === 'number' ? body.deletedItems : 0
      const groups = typeof body.groups === 'number' ? body.groups : 0
      push('success', t('settings.dedupDone', { deleted, groups }))
      invalidateFeed()
    },
    onError: (e) => push('error', t('common.loadFailed', { message: errorText(e, t) })),
  })

  const busy = cleanup.isPending || dedup.isPending

  return (
    <Card aria-labelledby="settings-maintenance-heading">
      <ConfirmDialog
        open={confirmCleanup}
        title={t('settings.cleanupConfirm')}
        description={t('settings.cleanupConfirmHint', { days })}
        confirmLabel={t('settings.runCleanup')}
        cancelLabel={t('common.cancel')}
        danger
        pending={cleanup.isPending}
        onConfirm={() => cleanup.mutate()}
        onCancel={() => {
          if (!cleanup.isPending) setConfirmCleanup(false)
        }}
      />
      <ConfirmDialog
        open={confirmDedup}
        title={t('settings.dedupConfirm')}
        description={t('settings.dedupConfirmHint')}
        confirmLabel={t('settings.runDedup')}
        cancelLabel={t('common.cancel')}
        danger
        pending={dedup.isPending}
        onConfirm={() => dedup.mutate()}
        onCancel={() => {
          if (!dedup.isPending) setConfirmDedup(false)
        }}
      />
      <h3 id="settings-maintenance-heading" tabIndex={-1} className="mb-1 font-serif text-lg outline-none">
        {t('settings.maintenanceSection')}
      </h3>
      <p className="mb-3 text-xs text-muted">{t('settings.backupHint')}</p>
      <Field label={t('settings.retentionDays')} hint={t('settings.retentionDaysHint')}>
        <Input
          type="number"
          min={0}
          max={3650}
          step={1}
          value={days}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10)
            patch({ retentionDays: Number.isFinite(n) && n >= 0 ? n : 0 })
          }}
          aria-label={t('settings.retentionDays')}
        />
      </Field>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="ghost"
          loading={cleanup.isPending}
          disabled={busy || days <= 0}
          title={days <= 0 ? t('settings.cleanupNeedsRetention') : undefined}
          aria-label={t('settings.runCleanup')}
          onClick={() => setConfirmCleanup(true)}
        >
          {t('settings.runCleanup')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          loading={dedup.isPending}
          disabled={busy}
          aria-label={t('settings.runDedup')}
          onClick={() => setConfirmDedup(true)}
        >
          {t('settings.runDedup')}
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">{t('settings.dedupHint')}</p>
    </Card>
  )
}
