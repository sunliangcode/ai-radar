import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './primitives/Button'
import { useImportPack } from '../hooks/useImportPack'

const PACK_IDS = ['ai-cn', 'ai-core', 'ai-signals'] as const

export function PackPicker({
  buttonLabel,
  importingLabel,
  successMessage,
  invalidate,
  variant = 'primary',
  className,
}: {
  buttonLabel: string
  importingLabel?: string
  successMessage?: string
  invalidate?: readonly (string | number)[][]
  variant?: 'primary' | 'ghost' | 'danger' | 'text' | 'icon'
  className?: string
}) {
  const { t } = useTranslation()
  const [packId, setPackId] = useState<(typeof PACK_IDS)[number]>('ai-cn')
  const importPack = useImportPack({ invalidate, successMessage })

  return (
    <div className={className ?? 'flex flex-wrap items-center gap-3'}>
      <select
        className="rounded-md border border-border bg-surface px-3 py-2 text-sm"
        value={packId}
        onChange={(e) => setPackId(e.target.value as (typeof PACK_IDS)[number])}
        aria-label={buttonLabel}
      >
        {PACK_IDS.map((id) => (
          <option key={id} value={id}>
            {t(`home.pack.${id}`)}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant={variant}
        loading={importPack.isPending}
        onClick={() => importPack.mutate(packId)}
      >
        {importPack.isPending ? (importingLabel ?? t('settings.importing')) : buttonLabel}
      </Button>
    </div>
  )
}
