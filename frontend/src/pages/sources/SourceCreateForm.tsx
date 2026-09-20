import { useEffect, useMemo, useRef, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { ConnectorDescriptor } from '../../lib/api'
import { Button, Input, Select } from '../../components/ui'
import { errorText } from '../../lib/errors'
import {
  connectorTypeCategory,
  SOURCE_CATEGORY_ORDER,
  type SourceCategoryId,
} from '../../lib/sourceCategories'
import { buildSourceConfig } from './buildSourceConfig'
import { SourceConfigFieldInput } from './SourceConfigFieldInput'
import { textLinkClass, cn } from '../../lib/cn'

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
  onCancel,
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
  onCancel?: () => void
}) {
  const { t } = useTranslation()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!onCancel || creating) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, creating])

  const typeOptions = useMemo(() => {
    const list = descriptors.length
      ? descriptors
      : ([{ id: type, displayName: type, configFields: [] }] as ConnectorDescriptor[])
    const byCat = new Map<SourceCategoryId, ConnectorDescriptor[]>()
    for (const id of SOURCE_CATEGORY_ORDER) byCat.set(id, [])
    for (const d of list) {
      byCat.get(connectorTypeCategory(d.id))!.push(d)
    }
    return SOURCE_CATEGORY_ORDER.map((id) => ({ id, items: byCat.get(id)! })).filter(
      (g) => g.items.length > 0,
    )
  }, [descriptors, type])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const sourceType = selected?.id ?? type
    onSubmit(buildSourceConfig(selected, fieldValues), sourceType)
  }

  return (
    <form
      id="source-create-form"
      onSubmit={handleSubmit}
      aria-label={t('sources.addRss')}
      aria-busy={creating || undefined}
      className="mb-6 grid gap-3 rounded-xl border border-border bg-surface/80 p-4 sm:grid-cols-2"
    >
      <label className="text-sm">
        <span className="text-muted">{t('sources.name')}</span>
        <Input
          ref={nameRef}
          className="mt-1"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
          disabled={creating}
        />
      </label>
      {showMoreTypes ? (
        <label className="text-sm">
          <span className="text-muted">{t('sources.type')}</span>
          <Select
            className="mt-1"
            value={selected?.id ?? type}
            onChange={(e) => onTypeChange(e.target.value)}
            disabled={creating}
          >
            {typeOptions.map((group) => (
              <optgroup key={group.id} label={t(`sources.category.${group.id}`)}>
                {group.items.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.displayName}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </label>
      ) : (
        <div className="flex items-end text-sm">
          <button
            type="button"
            className={cn(textLinkClass('moss'), 'inline-flex min-h-9 items-center')}
            disabled={creating}
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
      {selected?.id === 'DAILY_HOT' ? (
        <p className="text-xs text-muted sm:col-span-2">{t('sources.dailyHotHint')}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 sm:col-span-2" role="group" aria-label={t('sources.create')}>
        <Button type="submit" loading={creating} disabled={creating || !name.trim()}>
          {creating ? t('common.saving') : t('sources.create')}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" disabled={creating} onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        ) : null}
        {createError ? (
          <span role="alert" aria-live="assertive" className="text-sm text-ember">
            {errorText(createError, t)}
          </span>
        ) : null}
      </div>
    </form>
  )
}
