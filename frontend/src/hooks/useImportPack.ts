import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { useToast } from '../components/providers/ToastProvider'
import { useDisplaySources } from './useDisplaySources'
import { errorText } from '../lib/errors'

/**
 * Import a curated source pack. Shared by Today / Sources / Settings hub flows.
 */
export function useImportPack(options?: {
  invalidate?: readonly (string | number)[][]
  successMessage?: string
}) {
  const qc = useQueryClient()
  const { push } = useToast()
  const { t } = useTranslation()
  const { isRestricted, setAllDisplayed } = useDisplaySources()

  return useMutation({
    mutationFn: (packId: string) => api.importPack({ packId }),
    onSuccess: () => {
      const keys = options?.invalidate ?? [
        ['sources'],
        ['feed'],
        ['unread-counts'],
        ['intelligence-home'],
        ['changes-list'],
      ]
      for (const key of keys) {
        void qc.invalidateQueries({ queryKey: key })
      }
      const msg = t(options?.successMessage ?? 'settings.packImported')
      if (isRestricted) {
        push('success', msg, {
          label: t('sources.displayRestoreAll'),
          onClick: () => setAllDisplayed(),
        })
      } else {
        push('success', msg)
      }
    },
    onError: (e) => push('error', errorText(e, t)),
  })
}
