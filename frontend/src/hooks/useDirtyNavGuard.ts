import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Confirm before in-app link navigation while a form is dirty.
 * Browser unload is handled separately by useBeforeUnload; BrowserRouter has no useBlocker.
 */
export function useDirtyNavGuard(enabled: boolean) {
  const { t } = useTranslation()
  useEffect(() => {
    if (!enabled) return
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const target = e.target as HTMLElement | null
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor) return
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const href = anchor.getAttribute('href') ?? ''
      if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('mailto:')) return
      if (!window.confirm(t('common.unsavedLeaveConfirm'))) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [enabled, t])
}
