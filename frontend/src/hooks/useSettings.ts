import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'
import { useToast } from '../components/providers/ToastProvider'

/** Shared ['settings'] query. */
export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: api.settings })
}

/** Save settings: writes the response straight into the ['settings'] cache. */
export function useSaveSettings() {
  const qc = useQueryClient()
  const { push } = useToast()
  const { t } = useTranslation()

  return useMutation({
    mutationFn: api.saveSettings,
    onSuccess: (data) => {
      qc.setQueryData(['settings'], data)
      push('success', t('settings.saved'))
    },
    onError: (e) => push('error', (e as Error).message),
  })
}
