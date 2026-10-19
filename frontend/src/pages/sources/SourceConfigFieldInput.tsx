import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ConnectorConfigField } from '../../lib/api'
import {
  isMultilineConfigField,
  isPathConfigField,
  isSecretConfigField,
} from '../../lib/connectors'
import { Input } from '../../components/primitives/Input'
import { Textarea } from '../../components/primitives/Textarea'
import { textLinkClass } from '../../lib/cn'

/** Shared config field control — secret fields get textarea + clipboard paste. */
export function SourceConfigFieldInput({
  field,
  value,
  onChange,
  pasteLabel,
}: {
  field: ConnectorConfigField
  value: string
  onChange: (value: string) => void
  pasteLabel: string
}) {
  const { t } = useTranslation()
  const [pasteStatus, setPasteStatus] = useState<'ok' | 'fail' | null>(null)
  const isSecret = isSecretConfigField(field)
  const isMultiline = isMultilineConfigField(field)
  const isPath = isPathConfigField(field)

  async function pasteFromClipboard() {
    setPasteStatus(null)
    try {
      const text = await navigator.clipboard.readText()
      if (text?.trim()) {
        onChange(text.trim())
        setPasteStatus('ok')
      } else {
        setPasteStatus('fail')
      }
    } catch {
      // Clipboard permission denied — user can still paste manually.
      setPasteStatus('fail')
    }
  }

  return (
    <label className="text-sm sm:col-span-2">
      <span className="flex items-center justify-between gap-2 text-muted">
        <span>
          {field.label}
          {field.required ? ' *' : ''}
        </span>
        {isSecret ? (
          <button
            type="button"
            className={`inline-flex min-h-9 shrink-0 items-center text-xs ${textLinkClass('moss')}`}
            onClick={() => void pasteFromClipboard()}
            aria-label={`${pasteLabel}: ${field.label}`}
          >
            {pasteLabel}
          </button>
        ) : null}
      </span>
      {isMultiline ? (
        <Textarea
          className="mt-1 font-mono text-xs"
          rows={isSecret ? 4 : 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          aria-required={field.required || undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={isSecret ? 'name=value; name2=value2; …' : undefined}
        />
      ) : (
        <Input
          className={isPath ? 'mt-1 font-mono text-xs' : 'mt-1'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          aria-required={field.required || undefined}
          autoComplete={isSecret || isPath ? 'off' : undefined}
          spellCheck={isPath ? false : undefined}
        />
      )}
      {pasteStatus ? (
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`mt-1 block text-xs ${pasteStatus === 'ok' ? 'text-moss' : 'text-ember'}`}
        >
          {pasteStatus === 'ok' ? t('sources.pasteOk') : t('sources.pasteFail')}
        </span>
      ) : null}
    </label>
  )
}
