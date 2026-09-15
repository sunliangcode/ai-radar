import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Settings } from '../../lib/api'
import { Field } from '../../components/primitives/Field'
import { Input } from '../../components/primitives/Input'

/**
 * Text/number input bound to a single key of the Settings draft.
 *
 * <p>Numeric fields keep their own text draft so the user can clear a field or type a partial
 * number without the draft being overwritten by `Number('') === 0` or by `NaN` — the latter used to
 * be PUT to the server and stored as a broken setting. Invalid input stays visible and is flagged
 * instead of being committed.
 */
export function SettingsField({
  field,
  label,
  value,
  patch,
  type = 'text',
  className,
  hint,
  min,
  max,
  step,
}: {
  field: keyof Settings
  label: ReactNode
  value: unknown
  patch: (patch: Partial<Settings>) => void
  type?: 'text' | 'number'
  className?: string
  hint?: ReactNode
  min?: number
  max?: number
  step?: number
}) {
  const { t } = useTranslation()
  const incoming = value == null ? '' : String(value)
  const [draft, setDraft] = useState(incoming)
  const [syncedFrom, setSyncedFrom] = useState(incoming)
  const [focused, setFocused] = useState(false)

  // Adopt external updates (e.g. a settings reload) only while the user is not editing.
  // Adjusting state during render is the documented alternative to a sync effect here.
  if (!focused && incoming !== syncedFrom) {
    setSyncedFrom(incoming)
    setDraft(incoming)
  }

  const numeric = type === 'number'
  const parsed = numeric ? Number(draft) : Number.NaN
  const blank = draft.trim() === ''
  const notANumber = numeric && !blank && !Number.isFinite(parsed)
  const belowMin = numeric && !blank && Number.isFinite(parsed) && min != null && parsed < min
  const aboveMax = numeric && !blank && Number.isFinite(parsed) && max != null && parsed > max
  const invalid = notANumber || belowMin || aboveMax

  const onChange = (next: string) => {
    setDraft(next)
    if (!numeric) {
      patch({ [field]: next } as Partial<Settings>)
      return
    }
    if (next.trim() === '') return // keep the last valid value; don't commit 0 or NaN
    const n = Number(next)
    if (!Number.isFinite(n)) return
    patch({ [field]: n } as Partial<Settings>)
  }

  const errorText = notANumber
    ? t('settings.invalidNumber')
    : belowMin || aboveMax
      ? t('settings.outOfRange', { min: min ?? '-∞', max: max ?? '∞' })
      : undefined

  return (
    <Field label={label} hint={invalid ? <span className="text-ember">{errorText}</span> : hint}>
      <Input
        type={type}
        className={className}
        min={min}
        max={max}
        step={step}
        value={draft}
        aria-invalid={invalid || undefined}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          setDraft(incoming)
        }}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}
