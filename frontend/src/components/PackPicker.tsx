import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './primitives/Button'
import { ConfirmDialog } from './primitives/ConfirmDialog'
import { Select } from './primitives/Select'
import { useImportPack } from '../hooks/useImportPack'
import { errorText } from '../lib/errors'

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
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [statusAnnounce, setStatusAnnounce] = useState('')
  const importPack = useImportPack({ invalidate, successMessage })
  const btnRef = useRef<HTMLButtonElement>(null)
  const wasPending = useRef(false)

  useEffect(() => {
    if (importPack.isPending) {
      wasPending.current = true
      return
    }
    if (wasPending.current) {
      wasPending.current = false
      btnRef.current?.focus({ preventScroll: true })
    }
  }, [importPack.isPending])

  const packLabel = t(`home.pack.${packId}`)

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        title={t('settings.packImportConfirm', { pack: packLabel })}
        description={t('settings.packImportConfirmHint')}
        confirmLabel={buttonLabel}
        cancelLabel={t('common.cancel')}
        pending={importPack.isPending}
        onConfirm={() =>
          importPack.mutate(packId, {
            onSuccess: () => {
              setConfirmOpen(false)
              setStatusAnnounce(t(successMessage ?? 'settings.packImported'))
            },
            onError: (e) =>
              setStatusAnnounce(t('common.loadFailed', { message: errorText(e, t) })),
          })
        }
        onCancel={() => {
          if (!importPack.isPending) setConfirmOpen(false)
        }}
      />
      <div
        className={className ?? 'flex flex-wrap items-center gap-3'}
        role="group"
        aria-label={buttonLabel}
        aria-busy={importPack.isPending || undefined}
      >
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {statusAnnounce}
        </p>
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
          ref={btnRef}
          type="button"
          variant={variant}
          loading={importPack.isPending}
          disabled={importPack.isPending}
          aria-busy={importPack.isPending}
          aria-label={`${buttonLabel}: ${packLabel}`}
          onClick={() => setConfirmOpen(true)}
        >
          {importPack.isPending ? (importingLabel ?? t('settings.importing')) : buttonLabel}
        </Button>
      </div>
    </>
  )
}
