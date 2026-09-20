import { Component, useEffect, useRef, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from './primitives/Button'

/**
 * Catches render-time crashes in the routed page so the user gets an explanation and a way out.
 * Without this a thrown error unmounted the whole tree and left a blank main area.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ui_crash', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onReset={() => this.setState({ error: null })} />
    }
    return this.props.children
  }
}

function ErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const { t } = useTranslation()
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <div
      role="alert"
      className="rounded-lg border border-ember/40 bg-surface px-5 py-8 text-center text-sm"
    >
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-lg font-medium text-ink outline-none"
      >
        {t('common.crashTitle')}
      </h1>
      <p className="mx-auto mt-2 max-w-md text-muted">{t('common.crashHint')}</p>
      <pre className="mx-auto mt-3 max-w-xl overflow-x-auto rounded bg-border/40 px-3 py-2 text-left text-xs text-muted">
        {error.message || String(error)}
      </pre>
      <div className="mt-4 flex flex-wrap justify-center gap-3" role="group" aria-label={t('common.crashTitle')}>
        <Button onClick={onReset}>{t('common.retry')}</Button>
        <Button
          variant="ghost"
          onClick={() => {
            onReset()
            window.location.assign('/')
          }}
        >
          {t('common.backToToday')}
        </Button>
        <Button variant="ghost" onClick={() => window.location.reload()}>
          {t('common.reload')}
        </Button>
      </div>
    </div>
  )
}
