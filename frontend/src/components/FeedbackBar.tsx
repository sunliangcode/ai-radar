import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type FeedbackKind } from '../lib/api'

const KINDS: FeedbackKind[] = ['useful', 'irrelevant', 'watch', 'ignore', 'tried']

export function FeedbackBar({
  targetType,
  targetId,
  invalidateKeys = [],
}: {
  targetType: 'change' | 'action'
  targetId: number
  invalidateKeys?: (string | number)[][]
}) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const targetKey = `${targetType}:${targetId}`
  const [activeKind, setActiveKind] = useState<FeedbackKind | null>(() => {
    return (sessionStorage.getItem(`radar-feedback:${targetKey}`) as FeedbackKind | null) ?? null
  })

  const feedback = useMutation({
    mutationFn: (kind: FeedbackKind) => api.postFeedback({ targetType, targetId, kind }),
    onSuccess: (_data, kind) => {
      setActiveKind(kind)
      sessionStorage.setItem(`radar-feedback:${targetKey}`, kind)
      for (const key of invalidateKeys) {
        void qc.invalidateQueries({ queryKey: key })
      }
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      void qc.invalidateQueries({ queryKey: ['actions'] })
      void qc.invalidateQueries({ queryKey: ['changes'] })
    },
  })

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] text-muted">{t('feedback.label')}</span>
      {KINDS.map((kind) => {
        const active = activeKind === kind
        return (
          <button
            key={kind}
            type="button"
            aria-pressed={active}
            disabled={feedback.isPending}
            onClick={() => feedback.mutate(kind)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              active
                ? 'border-accent bg-accent-soft text-accent'
                : kind === 'ignore'
                  ? 'border-border bg-surface text-muted hover:border-ember/40 hover:text-ember'
                  : 'border-border bg-surface text-muted hover:border-accent/40 hover:text-ink'
            } disabled:opacity-50`}
          >
            {t(`feedback.${kind}`)}
          </button>
        )
      })}
      {feedback.isSuccess ? (
        <span className="self-center text-xs text-moss" role="status">
          {t('feedback.saved')}
        </span>
      ) : null}
      {feedback.isError ? (
        <span className="self-center text-xs text-ember" role="status">
          {(feedback.error as Error).message}
        </span>
      ) : null}
    </div>
  )
}
