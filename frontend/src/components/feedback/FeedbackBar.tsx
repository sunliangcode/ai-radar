import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api, type ActionCard, type FeedbackKind } from '../../lib/api'
import { Chip } from '../primitives/Chip'
import { useToast } from '../providers/ToastProvider'
import { errorText } from '../../lib/errors'

const KINDS: FeedbackKind[] = ['useful', 'irrelevant', 'watch', 'ignore', 'tried']

/** Mirrors backend FeedbackService.actionStatus */
function actionStatusForKind(kind: FeedbackKind): string {
  switch (kind) {
    case 'useful':
      return 'useful'
    case 'irrelevant':
    case 'ignore':
      return 'ignored'
    case 'watch':
      return 'watching'
    case 'tried':
      return 'started'
    default:
      return 'open'
  }
}

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
  const { push: pushToast } = useToast()
  const targetKey = `${targetType}:${targetId}`
  const [activeKind, setActiveKind] = useState<FeedbackKind | null>(() => {
    return (sessionStorage.getItem(`radar-feedback:${targetKey}`) as FeedbackKind | null) ?? null
  })

  const invalidateSurfaces = () => {
    for (const key of invalidateKeys) {
      void qc.invalidateQueries({ queryKey: key })
    }
    void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
    void qc.invalidateQueries({ queryKey: ['actions'] })
    void qc.invalidateQueries({ queryKey: ['changes'] })
    void qc.invalidateQueries({ queryKey: ['memory'] })
    void qc.invalidateQueries({ queryKey: ['contexts'] })
  }

  const feedback = useMutation({
    mutationFn: (kind: FeedbackKind) => api.postFeedback({ targetType, targetId, kind }),
    onMutate: async (kind) => {
      if (targetType !== 'action') return {}
      await qc.cancelQueries({ queryKey: ['actions'] })
      const prev = qc.getQueryData<ActionCard[]>(['actions'])
      const status = actionStatusForKind(kind)
      qc.setQueryData<ActionCard[]>(['actions'], (old) =>
        (old ?? []).map((a) => (a.id === targetId ? { ...a, status } : a)),
      )
      return { prevActions: prev, prevStatus: prev?.find((a) => a.id === targetId)?.status }
    },
    onSuccess: (_data, kind, ctx) => {
      setActiveKind(kind)
      sessionStorage.setItem(`radar-feedback:${targetKey}`, kind)
      invalidateSurfaces()
      const prevStatus = ctx?.prevStatus
      const toastKey = targetType === 'action' ? 'actions.statusUpdated' : 'feedback.saved'
      pushToast('success', t(toastKey), {
        label: t('common.undo'),
        onClick: () => {
          void api
            .withdrawFeedback({
              targetType,
              targetId,
              kind,
              previousActionStatus:
                targetType === 'action' && prevStatus && prevStatus !== actionStatusForKind(kind)
                  ? prevStatus
                  : undefined,
            })
            .then(() => {
              if (ctx?.prevActions) qc.setQueryData(['actions'], ctx.prevActions)
              sessionStorage.removeItem(`radar-feedback:${targetKey}`)
              setActiveKind(null)
              invalidateSurfaces()
            })
            .catch(() => undefined)
        },
      })
    },
    onError: (err, _kind, ctx) => {
      if (ctx?.prevActions) qc.setQueryData(['actions'], ctx.prevActions)
      pushToast('error', t('common.loadFailed', { message: errorText(err, t) }))
    },
  })

  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label={t('feedback.label')}
      aria-busy={feedback.isPending || undefined}
    >
      <span className="mr-1 text-[11px] text-muted" aria-hidden>
        {t('feedback.label')}
      </span>
      {KINDS.map((kind) => {
        const active = activeKind === kind
        return (
          <Chip
            key={kind}
            shape="pill"
            tone={kind === 'ignore' ? 'danger' : 'default'}
            active={active}
            disabled={feedback.isPending || active}
            aria-label={t(`feedback.${kind}`)}
            onClick={() => feedback.mutate(kind)}
          >
            {t(`feedback.${kind}`)}
          </Chip>
        )
      })}
    </div>
  )
}
