import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api, type Settings } from '../lib/api'
import { useToast } from '../components/providers/ToastProvider'
import { errorText } from '../lib/errors'

/** Shared ['settings'] query. */
export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: api.settings })
}

const UNDO_KEYS = [
  'summaryLanguage',
  'pushCron',
  'timezone',
  'pushOnlyWhenItems',
  'smtpTo',
  'retentionDays',
] as const satisfies readonly (keyof Settings)[]

function snapshotForUndo(settings: Settings | undefined, body: Partial<Settings>): Partial<Settings> {
  const out: Partial<Settings> = {}
  for (const key of UNDO_KEYS) {
    if (key in body && settings && key in settings) {
      ;(out as Record<string, unknown>)[key] = settings[key]
    }
  }
  return out
}

/** Save settings: writes the response straight into the ['settings'] cache. */
export function useSaveSettings() {
  const qc = useQueryClient()
  const { push } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: api.saveSettings,
    onMutate: async (body) => {
      await qc.cancelQueries({ queryKey: ['settings'] })
      const prev = qc.getQueryData<Settings>(['settings'])
      return { undoBody: snapshotForUndo(prev, body) }
    },
    onSuccess: (data, _body, ctx) => {
      qc.setQueryData(['settings'], data)
      // summaryLanguage / threshold affect Today cards and change copy.
      void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
      void qc.invalidateQueries({ queryKey: ['changes'] })
      void qc.invalidateQueries({ queryKey: ['changes-list'] })
      const undoBody = ctx?.undoBody
      const canUndo = Boolean(undoBody && Object.keys(undoBody).length > 0)
      push('success', t('settings.saved'), canUndo
        ? {
            label: t('common.undo'),
            onClick: () => {
              void api
                .saveSettings(undoBody!)
                .then((restored) => {
                  qc.setQueryData(['settings'], restored)
                  void qc.invalidateQueries({ queryKey: ['intelligence-home'] })
                  void qc.invalidateQueries({ queryKey: ['changes'] })
                  void qc.invalidateQueries({ queryKey: ['changes-list'] })
                })
                .catch(() => undefined)
            },
          }
        : undefined)
    },
    onError: (e) => push('error', errorText(e, t)),
  })
}
