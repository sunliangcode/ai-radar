import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ApiError, api, type Source, type SourceSetupStatus } from '../../lib/api'
import { Button, Textarea, useToast } from '../../components/ui'
import { useFocusTrap } from '../../components/layout/useFocusTrap'
import { errorText } from '../../lib/errors'
import { cn } from '../../lib/cn'
import {
  CLI_SETUP_INSTALL_DOCS_URL,
  isSetupInstallConflict,
  localizedSetupHint,
  SETUP_INSTALL_PHASES,
  setupInstallPhaseIndex,
  useSetupInstallPhaseFallback,
} from './sourceSetupUi'

type Step = 'install' | 'cookie' | 'done'

function setupErrorMessage(err: unknown, t: (key: string) => string): string {
  if (err instanceof ApiError) {
    const key = `sources.setup.errors.${err.code}`
    const localized = t(key)
    if (localized && localized !== key) return localized
  }
  return errorText(err, t)
}

function invalidateSetupQueries(
  qc: ReturnType<typeof useQueryClient>,
  sourceId: number,
) {
  void qc.invalidateQueries({ queryKey: ['source-setup', sourceId] })
  void qc.invalidateQueries({ queryKey: ['source-setup-batch'] })
  void qc.invalidateQueries({ queryKey: ['sources'] })
  void qc.invalidateQueries({ queryKey: ['source', sourceId] })
}

export function SourceSetupWizard({
  source,
  initial,
  onClose,
  onTestFetch,
}: {
  source: Source
  initial: SourceSetupStatus
  onClose: () => void
  /** After success — optional one-click test fetch (Sources list). */
  onTestFetch?: (sourceType: string) => void
}) {
  const { t } = useTranslation()
  const { push: pushToast } = useToast()
  const qc = useQueryClient()
  const dialogRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const descId = useId()
  const errorId = useId()
  const stepsId = useId()

  const startOnCookie =
    initial.state === 'need_cookie' ||
    (initial.state === 'unreachable' && !!initial.cliPath) ||
    initial.state === 'ready'
  const [step, setStep] = useState<Step>(
    initial.state === 'ready' ? 'done' : startOnCookie ? 'cookie' : 'install',
  )
  const [cookie, setCookie] = useState('')
  const [status, setStatus] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const autoStarted = useRef(false)
  const pendingRef = useRef(false)
  const joinedInstallToast = useRef(false)
  const [joiningInstall, setJoiningInstall] = useState(false)

  const finishInstallOutcome = useCallback(
    (data: SourceSetupStatus) => {
      setStatus(data)
      setError(null)
      invalidateSetupQueries(qc, source.id)
      if (data.state === 'ready') {
        setStep('done')
        pushToast('success', t('sources.setup.successToast', { name: source.name }))
        return
      }
      setStep('cookie')
    },
    [qc, pushToast, source.id, source.name, t],
  )

  const install = useMutation({
    mutationFn: () => api.sourceSetupInstall(source.id),
    onSuccess: (data) => {
      setJoiningInstall(false)
      joinedInstallToast.current = false
      finishInstallOutcome(data)
    },
    onError: (e) => {
      if (isSetupInstallConflict(e)) {
        setError(null)
        setJoiningInstall(true)
        if (!joinedInstallToast.current) {
          joinedInstallToast.current = true
          pushToast('success', t('sources.setup.joinedInstall'))
        }
        return
      }
      setJoiningInstall(false)
      joinedInstallToast.current = false
      setError(setupErrorMessage(e, t))
    },
  })

  const probe = useMutation({
    mutationFn: () =>
      api.sourceSetupProbe(source.id, {
        cookie: cookie.trim() || undefined,
        enableOnSuccess: true,
      }),
    onSuccess: (data) => {
      setStatus(data)
      invalidateSetupQueries(qc, source.id)
      if (data.state === 'ready') {
        setError(null)
        setStep('done')
        pushToast('success', t('sources.setup.successToast', { name: source.name }))
        return
      }
      setError(localizedSetupHint(data, t) || t('sources.setup.probeFailed'))
    },
    onError: (e) => setError(setupErrorMessage(e, t)),
  })

  const installInFlight = install.isPending || joiningInstall
  const pending = installInFlight || probe.isPending
  pendingRef.current = pending

  const setupPoll = useQuery({
    queryKey: ['source-setup', source.id, 'install-poll'],
    queryFn: () => api.sourceSetup(source.id),
    enabled: installInFlight,
    refetchInterval: installInFlight ? 1000 : false,
  })

  useEffect(() => {
    if (!joiningInstall || !setupPoll.data) return
    if (setupPoll.data.busy) return
    setJoiningInstall(false)
    joinedInstallToast.current = false
    finishInstallOutcome(setupPoll.data)
  }, [joiningInstall, setupPoll.data, finishInstallOutcome])

  const fallbackPhase = useSetupInstallPhaseFallback(
    installInFlight && !setupPoll.data?.installPhase,
  )
  const activeInstallPhase =
    setupPoll.data?.installPhase ?? fallbackPhase
  const activeInstallIndex = setupInstallPhaseIndex(activeInstallPhase)

  const describedBy = [descId, error ? errorId : null].filter(Boolean).join(' ')

  function copyDiagnostics() {
    const payload = {
      sourceId: source.id,
      sourceType: source.type,
      step,
      error,
      status,
    }
    void navigator.clipboard
      .writeText(JSON.stringify(payload, null, 2))
      .then(() => pushToast('success', t('sources.setup.copiedDiagnostics')))
      .catch(() => pushToast('error', t('sources.pasteFail')))
  }

  useFocusTrap({
    open: true,
    onClose: () => {
      if (!pendingRef.current) onClose()
    },
    containerRef: dialogRef,
    initialFocusRef: primaryRef,
  })

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // One-click path: open on missing CLI → start install immediately.
  useEffect(() => {
    if (autoStarted.current) return
    if (initial.state !== 'cli_missing') return
    autoStarted.current = true
    install.mutate()
    // mutate is stable enough for a one-shot; do not re-run on identity churn
    // oxlint-disable-next-line react/exhaustive-deps
  }, [initial.state])

  const stepIndex = step === 'install' ? 0 : step === 'cookie' ? 1 : 2
  const hint = !error ? localizedSetupHint(status, t) : null
  const cookieHelpKey = `sources.setup.cookieHelp.${source.type.toLowerCase()}` as const
  const cookieHelpFallback = t('sources.setup.cookieHelpGeneric')
  const cookieHelp =
    t(cookieHelpKey) !== cookieHelpKey ? t(cookieHelpKey) : cookieHelpFallback

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-[1px] motion-reduce:backdrop-blur-none"
      onMouseDown={(e) => {
        if (pending) return
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy || undefined}
        aria-busy={pending || undefined}
        className="w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-2xl"
      >
        <h3 id={titleId} className="text-base font-medium text-ink">
          {t('sources.setup.title', { name: source.name })}
        </h3>

        <ol
          id={stepsId}
          className="mt-3 flex items-center gap-2 text-xs"
          aria-label={t('sources.setup.stepsLabel')}
        >
          {(['install', 'cookie', 'done'] as const).map((s, i) => {
            const active = i === stepIndex
            const done = i < stepIndex
            return (
              <li key={s} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 font-medium',
                    active && 'bg-moss text-white',
                    done && 'bg-moss/20 text-moss',
                    !active && !done && 'bg-border text-muted',
                  )}
                  aria-current={active ? 'step' : undefined}
                >
                  {i + 1}
                </span>
                <span className={cn('truncate', active ? 'text-ink' : 'text-muted')}>
                  {t(`sources.setup.step.${s}`)}
                </span>
                {i < 2 ? <span className="mx-1 hidden h-px flex-1 bg-border sm:block" aria-hidden /> : null}
              </li>
            )
          })}
        </ol>

        <p id={descId} className="mt-3 text-sm leading-relaxed text-muted">
          {step === 'install'
            ? t('sources.setup.installHint')
            : step === 'cookie'
              ? t('sources.setup.cookieHint')
              : t('sources.setup.successHint')}
        </p>

        {step === 'install' || status.openSourceUrl ? (
          <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {step === 'install' ? (
              <a
                href={CLI_SETUP_INSTALL_DOCS_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-moss underline-offset-2 hover:underline"
              >
                {t('sources.setup.toolchainDocs')}
              </a>
            ) : null}
            {status.openSourceUrl ? (
              <a
                href={status.openSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-moss underline-offset-2 hover:underline"
              >
                {t('sources.setup.openProject')}
              </a>
            ) : null}
          </p>
        ) : null}

        {status.cliPath ? (
          <p className="mt-2 font-mono text-xs text-muted break-all">
            {t('sources.setup.cliPath')}: {status.cliPath}
          </p>
        ) : null}

        {status.busy && !installInFlight ? (
          <p className="mt-3 text-sm text-muted" role="status">
            {t('sources.setup.errors.setup_busy')}
          </p>
        ) : null}
        {joiningInstall ? (
          <p className="mt-3 text-sm text-ink" role="status">
            {t('sources.setup.joinedInstall')}
          </p>
        ) : null}

        {installInFlight ? (
          <div className="mt-3 space-y-2" role="status" aria-live="polite">
            <p className="text-sm text-ink">{t('sources.setup.installing')}</p>
            {setupPoll.data?.installMessage ? (
              <p className="font-mono text-xs text-muted break-all">{setupPoll.data.installMessage}</p>
            ) : null}
            <ol className="space-y-1 text-xs text-muted" aria-label={t('sources.setup.installPhaseLabel')}>
              {SETUP_INSTALL_PHASES.map((phase, i) => {
                const active = phase === activeInstallPhase
                const done = i < activeInstallIndex
                return (
                  <li
                    key={phase}
                    className={cn(
                      'flex items-center gap-2',
                      (active || done) && 'font-medium text-ink',
                      done && !active && 'text-muted',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-1.5 w-1.5 rounded-full',
                        done && 'bg-moss',
                        active && 'bg-moss animate-pulse motion-reduce:animate-none',
                        !done && !active && 'bg-border',
                      )}
                      aria-hidden
                    />
                    {t(`sources.setup.installPhase.${phase}`)}
                  </li>
                )
              })}
            </ol>
          </div>
        ) : null}
        {probe.isPending ? (
          <p className="mt-3 text-sm text-ink" role="status" aria-live="polite">
            {t('sources.setup.probing')}
          </p>
        ) : null}
        {status.method && step !== 'install' ? (
          <p className="mt-2 text-xs text-muted">
            {t('sources.setup.installMethod', { method: status.method })}
          </p>
        ) : null}

        {status.detail && !installInFlight ? (
          <details className="mt-3 rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs">
            <summary className="cursor-pointer font-medium text-ink">
              {t('sources.setup.installDetail')}
            </summary>
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all font-mono text-muted">
              {status.detail}
            </pre>
          </details>
        ) : null}

        {step === 'cookie' ? (
          <div className="mt-4 space-y-2">
            <label className="block text-sm font-medium text-ink" htmlFor={`${titleId}-cookie`}>
              {t('sources.setup.cookieLabel')}
            </label>
            <Textarea
              id={`${titleId}-cookie`}
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              rows={4}
              placeholder={t('sources.setup.cookiePlaceholder')}
              disabled={pending}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="text-xs text-muted">{t('sources.setup.cookieOptional')}</p>
            <details className="rounded-lg border border-border/80 px-3 py-2 text-xs text-muted">
              <summary className="cursor-pointer font-medium text-ink">
                {t('sources.setup.cookieHelpTitle')}
              </summary>
              <p className="mt-2 leading-relaxed">{cookieHelp}</p>
            </details>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  void navigator.clipboard
                    .readText()
                    .then((text) => {
                      setCookie(text)
                      setError(null)
                    })
                    .catch(() => setError(t('sources.pasteFail')))
                }}
              >
                {t('sources.pasteCookie')}
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div id={errorId} className="mt-3 space-y-2" role="alert">
            <p className="text-sm text-danger">{error}</p>
            <Button variant="ghost" size="sm" onClick={copyDiagnostics}>
              {t('sources.setup.copyDiagnostics')}
            </Button>
          </div>
        ) : null}
        {hint && step !== 'done' ? (
          <p className="mt-3 text-sm text-muted" role="status">
            {hint}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2" role="group" aria-label={source.name}>
          <Button variant="ghost" disabled={pending && step !== 'done'} onClick={onClose}>
            {step === 'done' ? t('common.dismiss') : t('common.cancel')}
          </Button>
          {step === 'install' && error ? (
            <Button variant="ghost" disabled={pending} onClick={() => install.mutate()}>
              {t('common.retry')}
            </Button>
          ) : null}
          {step === 'cookie' && error ? (
            <Button variant="ghost" disabled={pending} onClick={() => probe.mutate()}>
              {t('common.retry')}
            </Button>
          ) : null}
          {step === 'install' ? (
            <Button
              ref={primaryRef}
              loading={install.isPending}
              disabled={pending}
              onClick={() => install.mutate()}
            >
              {install.isPending ? t('sources.setup.installingShort') : t('sources.setup.install')}
            </Button>
          ) : null}
          {step === 'cookie' ? (
            <Button
              ref={primaryRef}
              loading={probe.isPending}
              disabled={pending}
              onClick={() => probe.mutate()}
            >
              {probe.isPending ? t('sources.setup.probingShort') : t('sources.setup.test')}
            </Button>
          ) : null}
          {step === 'done' && onTestFetch ? (
            <Button
              variant="ghost"
              onClick={() => {
                onTestFetch(source.type)
                onClose()
              }}
            >
              {t('sources.testFetch')}
            </Button>
          ) : null}
          {step === 'done' ? (
            <Button ref={primaryRef} onClick={onClose}>
              {t('sources.setup.done')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
