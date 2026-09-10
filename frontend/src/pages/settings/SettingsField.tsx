import type { ReactNode } from 'react'
import type { Settings } from '../../lib/api'
import { Field } from '../../components/primitives/Field'
import { Input } from '../../components/primitives/Input'

/**
 * Text/number input bound to a single key of the Settings draft.
 * Keeps the `as Partial<Settings>` cast in one place.
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
  return (
    <Field label={label} hint={hint}>
      <Input
        type={type}
        className={className}
        min={min}
        max={max}
        step={step}
        value={String(value ?? '')}
        onChange={(e) =>
          patch({
            [field]: type === 'number' ? Number(e.target.value) : e.target.value,
          } as Partial<Settings>)
        }
      />
    </Field>
  )
}
