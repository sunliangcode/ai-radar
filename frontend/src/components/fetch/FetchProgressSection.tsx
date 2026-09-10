import type { FetchProgress } from '../../lib/api'
import type { FetchPhase } from '../../hooks/useFetchJobWithProgress'
import { FetchProgressPanel } from './FetchProgressPanel'
import { FetchResultSummary } from './FetchResultSummary'

/**
 * Renders the running progress panel or the final result summary for a
 * fetch job — the exact pair of blocks that used to be copy-pasted in
 * FeedPage, TodayPage and SourcesPage.
 */
export function FetchProgressSection({
  phase,
  progress,
  onDismiss,
  retrying,
  onRetryFailed,
}: {
  phase: FetchPhase
  progress?: FetchProgress
  onDismiss: () => void
  retrying?: boolean
  onRetryFailed?: (sourceTypes: string[]) => void
}) {
  if (phase === 'running') return <FetchProgressPanel progress={progress} />
  if (phase === 'summary') {
    return (
      <FetchResultSummary
        progress={progress}
        onDismiss={onDismiss}
        retrying={retrying}
        onRetryFailed={onRetryFailed}
      />
    )
  }
  return null
}
