import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { useToast } from '../components/providers/ToastProvider'
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

  return useMutation({
    mutationFn: (packId: string) => api.importPack({ packId }),
    onSuccess: () => {
      for (const key of options?.invalidate ?? [['sources']]) {
        void qc.invalidateQueries({ queryKey: key })
      }
      push('success', t(options?.successMessage ?? 'settings.packImported'))
    },
    onError: (e) => push('error', errorText(e, t)),
  })
}
