/**
 * Barrel re-export for the UI component library.
 *
 * Components live in focused modules:
 *  - providers/  PrefsProvider (theme & density), ToastProvider
 *  - primitives/ Button, Input, Select, Textarea, Field, Card, Badge, Chip,
 *                ProgressBar, Skeleton, States, ConfirmDialog, PageHeader, FormSaveBar
 *  - score/      ScoreBar, legacy ScorePill & ItemRow
 *  - feedback/   FeedbackBar
 *  - fetch/      FetchProgressPanel, FetchResultSummary
 *
 * Prefer importing from the specific module in new code.
 */

export { PrefsProvider, usePrefs, type Theme, type Density } from './providers/PrefsProvider'
export { ToastProvider, useToast } from './providers/ToastProvider'

export { Button, buttonVariants } from './primitives/Button'
export { Input, inputClasses } from './primitives/Input'
export { Select } from './primitives/Select'
export { Textarea } from './primitives/Textarea'
export { Field } from './primitives/Field'
export { Card } from './primitives/Card'
export { StatusBadge, ScoreSourceBadge, SourceBadge } from './primitives/Badge'
export { Chip } from './primitives/Chip'
export { ProgressBar } from './primitives/Progress'
export { ListSkeleton } from './primitives/Skeleton'
export { StateBox, EmptyState } from './primitives/States'
export { ConfirmDialog } from './primitives/ConfirmDialog'
export { PageHeader } from './primitives/PageHeader'
export { FormSaveBar } from './primitives/FormSaveBar'

export { ScoreBar } from './score/ScoreBar'
export { ScorePill } from './score/ScorePill'
export { ItemRow } from './score/ItemRow'

export { FeedbackBar } from './feedback/FeedbackBar'

export { FetchProgressPanel } from './fetch/FetchProgressPanel'
export { FetchResultSummary } from './fetch/FetchResultSummary'
