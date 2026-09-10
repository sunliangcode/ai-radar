import { useTranslation } from 'react-i18next'
import { useBeforeUnload } from '../../hooks/useBeforeUnload'
import { Button } from './Button'

export function FormSaveBar({
  dirty,
  saving,
  onSave,
  onDiscard,
}: {
  dirty: boolean
  saving?: boolean
  onSave: () => void
  onDiscard: () => void
}) {
  const { t } = useTranslation()
  useBeforeUnload(dirty)
  if (!dirty) return null
  return (
    <div className="sticky bottom-4 z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-surface/95 px-4 py-3 shadow-lg backdrop-blur">
      <span className="text-sm text-muted">{t('common.unsavedChanges')}</span>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onDiscard} disabled={saving}>
          {t('common.discard')}
        </Button>
        <Button onClick={onSave} loading={saving}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  )
}
