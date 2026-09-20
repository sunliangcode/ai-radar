import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ConnectorDescriptor } from '../../lib/api'
import { Button } from '../../components/ui'
import { errorText } from '../../lib/errors'
import { buildSourceConfig } from './buildSourceConfig'
import { SourceConfigFieldInput } from './SourceConfigFieldInput'

export function SourceCreateForm({
  descriptors,
  otherDescriptors,
  selected,
  showMoreTypes,
  name,
  type,
  fieldValues,
  creating,
  createError,
  onNameChange,
  onTypeChange,
  onShowMoreTypes,
  onFieldChange,
  onSubmit,
}: {
  descriptors: ConnectorDescriptor[]
  otherDescriptors: ConnectorDescriptor[]
  selected: ConnectorDescriptor | undefined
  showMoreTypes: boolean
  name: string
  type: string
  fieldValues: Record<string, string>
  creating: boolean
  createError: unknown
  onNameChange: (name: string) => void
  onTypeChange: (type: string) => void
  onShowMoreTypes: () => void
  onFieldChange: (key: string, value: string) => void
  onSubmit: (config: Record<string, unknown>, sourceType: string) => void
}) {
  const { t } = useTranslation()

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const sourceType = selected?.id ?? type
    onSubmit(buildSourceConfig(selected, fieldValues), sourceType)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 grid gap-3 rounded-xl border border-border bg-surface/80 p-4 sm:grid-cols-2"
    >
      <label className="text-sm">
        <span className="text-muted">{t('sources.name')}</span>
        <input
          className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
        />
      </label>
      {showMoreTypes ? (
        <label className="text-sm">
          <span className="text-muted">{t('sources.type')}</span>
          <select
            className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2"
            value={selected?.id ?? type}
            onChange={(e) => onTypeChange(e.target.value)}
          >
            {(descriptors.length ? descriptors : [{ id: type, displayName: type, configFields: [] }]).map(
              (d) => (
                <option key={d.id} value={d.id}>
                  {d.displayName}
                </option>
              ),
            )}
          </select>
        </label>
      ) : (
        <div className="flex items-end text-sm">
          <button
            type="button"
            className="text-moss underline underline-offset-2"
            onClick={() => {
              onShowMoreTypes()
              if (otherDescriptors[0]) onTypeChange(otherDescriptors[0].id)
            }}
          >
            {t('sources.moreTypes')}
          </button>
        </div>
      )}
      {selected?.configFields.map((field) => (
        <SourceConfigFieldInput
          key={field.key}
          field={field}
          value={fieldValues[field.key] ?? ''}
          onChange={(v) => onFieldChange(field.key, v)}
          pasteLabel={t('sources.pasteCookie')}
        />
      ))}
      {selected?.id === 'PRODUCT_HUNT' ? (
        <p className="text-xs text-muted sm:col-span-2">{t('sources.phTokenHint')}</p>
      ) : null}
      {selected?.id === 'TWITTER' ? (
        <p className="text-xs text-muted sm:col-span-2">{t('sources.apifyTokenHint')}</p>
      ) : null}
      {selected?.id === 'EMAIL' ? (
        <p className="text-xs text-muted sm:col-span-2">{t('sources.emailHint')}</p>
      ) : null}
      {selected?.id === 'ZHIHU' || selected?.id === 'WEIBO' || selected?.id === 'BILIBILI' ? (
        <p className="text-xs text-muted sm:col-span-2">{t('sources.ossCliHint')}</p>
      ) : null}
      <div className="sm:col-span-2">
        <Button type="submit" loading={creating}>
          {creating ? t('common.saving') : t('sources.create')}
        </Button>
        {createError ? (
          <span className="ml-3 text-sm text-ember">{errorText(createError, t)}</span>
        ) : null}
      </div>
    </form>
  )
}
