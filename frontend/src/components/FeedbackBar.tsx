import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, type FeedbackKind } from '../lib/api'
import { Button } from './ui'

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
  const feedback = useMutation({
    mutationFn: (kind: FeedbackKind) => api.postFeedback({ targetType, targetId, kind }),
    onSuccess: () => {
      for (const key of invalidateKeys) {
        void qc.invalidateQueries({ queryKey: key })
      }
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      void qc.invalidateQueries({ queryKey: ['actions'] })
      void qc.invalidateQueries({ queryKey: ['changes'] })
    },
  })

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {KINDS.map((kind) => (
        <Button
          key={kind}
          variant="text"
          disabled={feedback.isPending}
          onClick={() => feedback.mutate(kind)}
        >
          {t(`feedback.${kind}`)}
        </Button>
      ))}
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
