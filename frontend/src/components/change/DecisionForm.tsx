import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui'

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

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(kind, reason, revisitAt)
      }}
    >
      <label className="block text-sm">
        <span className="text-muted">{t('decisions.kind')}</span>
        <select
          className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value as DecisionKind)}
        >
          <option value="watch">{t('decisions.kindWatch')}</option>
          <option value="investigate">{t('decisions.kindInvestigate')}</option>
          <option value="adopt">{t('decisions.kindAdopt')}</option>
          <option value="ignore">{t('decisions.kindIgnore')}</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="text-muted">{t('decisions.reason')}</span>
        <textarea
          className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted">{t('decisions.revisit')}</span>
        <input
          type="date"
          className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
          value={revisitAt}
          onChange={(e) => setRevisitAt(e.target.value)}
        />
      </label>
      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={loading}>
          {t('decisions.save')}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  )
}
