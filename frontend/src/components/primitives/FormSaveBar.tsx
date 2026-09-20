import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBeforeUnload } from '../../hooks/useBeforeUnload'
import { useDirtyNavGuard } from '../../hooks/useDirtyNavGuard'
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
  useDirtyNavGuard(dirty)

  useEffect(() => {
    if (!dirty) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (!saving) onSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dirty, saving, onSave])

  if (!dirty) return null
  const saveShortcut =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘S' : 'Ctrl+S'
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={saving || undefined}
      className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-surface/95 px-4 py-3 shadow-lg backdrop-blur motion-reduce:backdrop-blur-none supports-[backdrop-filter]:bg-surface/80 motion-reduce:supports-[backdrop-filter]:bg-surface"
    >
      <span className="text-sm text-muted">
        {t('common.unsavedChanges')}
        <kbd className="ml-2 hidden font-mono text-[10px] text-faint sm:inline" aria-hidden>
          {saveShortcut}
        </kbd>
      </span>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onDiscard} disabled={saving}>
          {t('common.discard')}
        </Button>
        <Button onClick={onSave} loading={saving} title={saveShortcut}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  )
}
