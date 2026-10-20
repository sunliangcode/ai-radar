import { useEffect, useState } from 'react'
import { ApiError, type SourceSetupStatus } from '../../lib/api'
import { prefersReducedMotion } from '../../lib/a11y'

/** Overlapping CLI install for the same binary returns HTTP 409 (mutex). */
export function isSetupInstallConflict(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    err.status === 409 &&
    (err.code === 'setup_busy' || err.code === 'conflict')
  )
}

export const CLI_SETUP_INSTALL_DOCS_URL =
  'https://github.com/sunliangcode/ai-radar/blob/main/docs/installation.md'

export type SetupStateKey = SourceSetupStatus['state']

/** Matches backend CliInstallProgress / CliPackageInstaller phases. */
export const SETUP_INSTALL_PHASES = ['package', 'clone', 'build', 'resolve', 'probe'] as const
export type SetupInstallPhase = (typeof SETUP_INSTALL_PHASES)[number]

const PHASE_MS = 8_000

export function setupInstallPhaseIndex(phase: string | undefined): number {
  if (!phase) return 0
  const idx = SETUP_INSTALL_PHASES.indexOf(phase as SetupInstallPhase)
  return idx >= 0 ? idx : 0
}

/** Fallback ticker when backend phase is not yet available. */
export function useSetupInstallPhaseFallback(installing: boolean): SetupInstallPhase {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!installing || prefersReducedMotion()) return
    const id = window.setInterval(() => setTick((t) => t + 1), PHASE_MS)
    return () => window.clearInterval(id)
  }, [installing])
  if (!installing || prefersReducedMotion()) return SETUP_INSTALL_PHASES[0]
  return SETUP_INSTALL_PHASES[tick % SETUP_INSTALL_PHASES.length]
}

/** i18n key under sources.setup.state* */
export function setupStateLabelKey(state: string | undefined): string | null {
  switch (state) {
    case 'ready':
      return 'sources.setup.stateReady'
    case 'cli_missing':
      return 'sources.setup.stateCliMissing'
    case 'need_cookie':
      return 'sources.setup.stateNeedCookie'
    case 'unreachable':
      return 'sources.setup.stateUnreachable'
    default:
      return null
  }
}

/** Tailwind classes for list/detail readiness chips. */
export function setupChipClass(state: string | undefined): string {
  switch (state) {
    case 'ready':
      return 'bg-moss/15 text-moss'
    case 'need_cookie':
      return 'bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200'
    case 'unreachable':
      return 'bg-red-500/10 text-red-700 dark:text-red-300'
    case 'cli_missing':
      return 'bg-border/80 text-ink'
    default:
      return 'bg-border/80 text-muted'
  }
}

export function setupListRowActions(
  setup: SourceSetupStatus | undefined,
  cliType: boolean,
): { showInstall: boolean; showCookieSetup: boolean } {
  const showInstall = Boolean(setup?.installAvailable)
  const showCookieSetup =
    cliType &&
    Boolean(setup?.supported) &&
    (setup?.state === 'need_cookie' || setup?.state === 'unreachable') &&
    !showInstall
  return { showInstall, showCookieSetup }
}

export function localizedSetupHint(
  status: Pick<SourceSetupStatus, 'hintCode' | 'reason'>,
  t: (key: string) => string,
): string | null {
  if (!status.hintCode) return status.reason || null
  const key = `sources.setup.hints.${status.hintCode}`
  const localized = t(key)
  if (localized && localized !== key) return localized
  return status.reason || null
}
