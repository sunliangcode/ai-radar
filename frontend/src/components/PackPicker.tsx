import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './primitives/Button'
import { Select } from './primitives/Select'
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
    <div className={className ?? 'flex flex-wrap items-center gap-3'} role="group" aria-label={buttonLabel}>
      <Select
        className="w-auto min-w-[10rem]"
        value={packId}
        disabled={importPack.isPending}
        onChange={(e) => setPackId(e.target.value as (typeof PACK_IDS)[number])}
        aria-label={t('settings.packSection')}
      >
        {PACK_IDS.map((id) => (
          <option key={id} value={id}>
            {t(`home.pack.${id}`)}
          </option>
        ))}
      </Select>
      <Button
        type="button"
        variant={variant}
        loading={importPack.isPending}
        disabled={importPack.isPending}
        aria-busy={importPack.isPending}
        onClick={() => importPack.mutate(packId)}
      >
        {importPack.isPending ? (importingLabel ?? t('settings.importing')) : buttonLabel}
      </Button>
    </div>
  )
}
