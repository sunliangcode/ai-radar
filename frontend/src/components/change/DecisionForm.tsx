import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, Input, Select, Textarea } from '../ui'
import { isAriaModalOpen } from '../../lib/a11y'

export type DecisionKind = 'ignore' | 'investigate' | 'adopt' | 'watch'

export function DecisionForm({
  onSubmit,
  onCancel,
  loading,
  defaultKind,
}: {
  onSubmit: (kind: DecisionKind, reason: string, revisitAt: string) => void
  onCancel: () => void
  loading?: boolean
  defaultKind?: DecisionKind
}) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<DecisionKind>(defaultKind ?? 'watch')
  const [reason, setReason] = useState('')
  const [revisitAt, setRevisitAt] = useState('')
  const formId = useId()
  const kindId = `${formId}-kind`
  const reasonId = `${formId}-reason`
  const revisitId = `${formId}-revisit`

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (isAriaModalOpen()) return
      if (loading) return
      e.preventDefault()
      e.stopImmediatePropagation()
      onCancel()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onCancel, loading])

  return (
    <form
      className="space-y-3"
      aria-busy={loading || undefined}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(kind, reason, revisitAt)
      }}
    >
      <Field label={t('decisions.kind')}>
        <Select
          id={kindId}
          value={kind}
          onChange={(e) => setKind(e.target.value as DecisionKind)}
          aria-label={t('decisions.kind')}
        >
          <option value="watch">{t('decisions.kindWatch')}</option>
          <option value="investigate">{t('decisions.kindInvestigate')}</option>
          <option value="adopt">{t('decisions.kindAdopt')}</option>
          <option value="ignore">{t('decisions.kindIgnore')}</option>
        </Select>
      </Field>
      <Field label={t('decisions.reason')}>
        <Textarea
          id={reasonId}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label={t('decisions.reason')}
        />
      </Field>
      <Field label={t('decisions.revisit')}>
        <Input
          id={revisitId}
          type="date"
          value={revisitAt}
          onChange={(e) => setRevisitAt(e.target.value)}
          aria-label={t('decisions.revisit')}
        />
      </Field>
      <div className="flex gap-2 pt-1" role="group" aria-label={t('decisions.record')}>
        <Button type="submit" loading={loading} disabled={loading}>
          {t('decisions.save')}
        </Button>
        <Button type="button" variant="ghost" disabled={loading} onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
