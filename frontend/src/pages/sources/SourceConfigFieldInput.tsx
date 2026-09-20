import type { ConnectorConfigField } from '../../lib/api'

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
  const isSecret = field.type === 'secret' || field.key.toLowerCase().includes('cookie')
  const isMultiline =
    isSecret || field.key.toLowerCase().includes('prompt') || field.type === 'textarea'

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText()
      if (text?.trim()) onChange(text.trim())
    } catch {
      // Clipboard permission denied — user can still paste manually.
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
            className="shrink-0 text-xs text-moss underline underline-offset-2"
            onClick={() => void pasteFromClipboard()}
          >
            {pasteLabel}
          </button>
        ) : null}
      </span>
      {isMultiline ? (
        <textarea
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs"
          rows={isSecret ? 4 : 3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          autoComplete="off"
          spellCheck={false}
          placeholder={isSecret ? 'name=value; name2=value2; …' : undefined}
        />
      ) : (
        <input
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          autoComplete={isSecret ? 'off' : undefined}
        />
      )}
    </label>
  )
}
