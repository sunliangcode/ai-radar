import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, Input, Textarea } from '../ui'
import { isAriaModalOpen } from '../../lib/a11y'
import { cn, focusRingClass } from '../../lib/cn'

export type DecisionKind = 'ignore' | 'investigate' | 'adopt' | 'watch'

const KINDS: DecisionKind[] = ['watch', 'investigate', 'adopt', 'ignore']

function defaultRevisit(kind: DecisionKind): string {
  if (kind === 'ignore' || kind === 'adopt') return ''
  const d = new Date()
  d.setDate(d.getDate() + (kind === 'investigate' ? 3 : 7))
  return d.toISOString().slice(0, 10)
}

export function DecisionForm({
  onSubmit,
  onCancel,
  loading,
  defaultKind,
  autoFocus,
}: {
  onSubmit: (kind: DecisionKind, reason: string, revisitAt: string) => void
  onCancel: () => void
  loading?: boolean
  defaultKind?: DecisionKind
  /** When opened from Today “Decide”, focus the reason field. */
  autoFocus?: boolean
}) {
  const { t } = useTranslation()
  const [kind, setKind] = useState<DecisionKind>(defaultKind ?? 'watch')
  const [reason, setReason] = useState('')
  const [revisitAt, setRevisitAt] = useState(() => defaultRevisit(defaultKind ?? 'watch'))
  const formId = useId()
  const reasonId = `${formId}-reason`
  const revisitId = `${formId}-revisit`
  const reasonRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!autoFocus) return
    reasonRef.current?.focus({ preventScroll: true })
  }, [autoFocus])

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

  const pickKind = (next: DecisionKind) => {
    setKind(next)
    setRevisitAt((prev) => (prev ? prev : defaultRevisit(next)))
  }

  return (
    <form
      className="space-y-3"
      aria-busy={loading || undefined}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(kind, reason, revisitAt)
      }}
    >
      <div className="space-y-1.5">
        <p id={`${formId}-kind-label`} className="text-sm text-muted">
          {t('decisions.kind')}
        </p>
        <div
          className="flex flex-wrap gap-1.5"
          role="radiogroup"
          aria-labelledby={`${formId}-kind-label`}
        >
          {KINDS.map((k) => {
            const selected = kind === k
            const label = t(
              k === 'watch'
                ? 'decisions.kindWatch'
                : k === 'investigate'
                  ? 'decisions.kindInvestigate'
                  : k === 'adopt'
                    ? 'decisions.kindAdopt'
                    : 'decisions.kindIgnore',
            )
            return (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={label}
                disabled={loading}
                onClick={() => pickKind(k)}
                className={cn(
                  'inline-flex min-h-9 items-center rounded-md border px-2.5 py-1.5 text-xs font-medium transition motion-reduce:transition-none',
                  focusRingClass(),
                  selected
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-muted hover:border-accent/40 hover:text-ink',
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
      <Field label={t('decisions.reason')}>
        <Textarea
          ref={reasonRef}
          id={reasonId}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          aria-label={t('decisions.reason')}
          placeholder={t('decisions.reasonHint')}
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
