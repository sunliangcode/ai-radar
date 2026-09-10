const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  code: string
  status: number

  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const token = localStorage.getItem('localToken')
  if (token) {
    headers.set('X-Local-Token', token)
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (!res.ok) {
    let code = 'error'
    let message = res.statusText
    try {
      const body = await res.json()
      code = body.code ?? code
      message = body.message ?? message
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, code, message)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return res.json() as Promise<T>
}

export type Source = {
  id: number
  name: string
  type: string
  enabled: boolean
  lastFetchedAt?: string
  config?: Record<string, unknown>
  sampleItems?: Item[]
}

export type Item = {
  id: number
  title: string
  titleDisplay?: string | null
  canonicalUrl: string
  score?: number
  scoreReason?: string
  scoreSource?: 'rule' | 'ai' | 'unknown'
  stars?: number
  starsDelta7d?: number
  summary?: string
  contentSnippet?: string
  tags?: string[]
  category?: string
  publishedAt?: string
  sourceRefs?: string[]
  primarySourceType?: string
  read?: boolean
  saved?: boolean
  dismissed?: boolean
  createdAt?: string
  eventId?: number
}

export type RadarEvent = {
  id: number
  title: string
  status: string
  score?: number
  summary?: string
  impact?: string
  watchNext?: string
  firstSeenAt?: string
  lastUpdatedAt?: string
  itemCount?: number
  timeline?: { id: number; at: string; label: string; note?: string; newsItemId?: number }[]
  items?: Item[]
}

export type ImpactCard = {
  id: number
  eventId: number
  title: string
  relevance?: number
  impact?: number
  urgency?: number
  confidence?: number
  effort?: number
  priority?: number
  tier?: string
  why?: string
  evidence?: string
  recommendation?: string
  updatedAt?: string
  watchNext?: string
  summary?: string
  score?: number
  status?: string
}

export type ActionCard = {
  id: number
  title: string
  steps?: string[]
  estimatedMinutes?: number
  successCriteria?: string
  status?: string
  eventId?: number
  impactId?: number
  newsItemId?: number
}

export type PreferenceKeyword = {
  id: number
  kind: 'like' | 'dislike'
  text: string
  source?: string
  itemId?: number | null
  createdAt?: string
}

export type OpportunityCard = {
  id: number
  title: string
  summary?: string
  estimatedHours?: number
  coveragePct?: number
  kind?: string
  eventId?: number
}

export type ExperimentCard = {
  id: number
  actionId: number
  title: string
  goal?: string
  status?: string
  successRate?: number
  latencyMs?: number
  tokenCost?: number
  humanIntervention?: number
  reviewTimeMin?: number
  notes?: string
}

export type OutcomeSummary = {
  monthKey: string
  insights?: number
  actions?: number
  experiments?: number
  successful?: number
  timeSavedHours?: number
  aiCost?: number
  roi?: number | null
}

export type UserContext = {
  id?: number
  payload: {
    profile?: { role?: string; summary?: string }
    projects?: { name?: string; type?: string; stack?: string[]; url?: string }[]
    technologies?: string[]
    interests?: string[]
    goals?: string[]
    preferences?: Record<string, unknown>
  }
  rawText?: string
  source?: string
  createdAt?: string
  updatedAt?: string
}

export type ChangeCard = {
  id: number
  eventId: number
  title: string
  summary?: string
  changeType?: string
  confidence?: number
  trend?: string
  status?: string
  firstDetectedAt?: string
  lastUpdatedAt?: string
  sourceCount?: number
  itemCount?: number
  score?: number
  relevance?: number
  impact?: number
  urgency?: number
  analysisConfidence?: number
  tier?: string
  why?: string
  evidence?: string
  recommendation?: string
  priority?: number
  impactAnalysis?: ImpactCard
  timeline?: { id: number; at: string; label: string; note?: string; newsItemId?: number }[]
  items?: Item[]
  watchNext?: string
  eventImpact?: string
}

export type FeedbackKind = 'useful' | 'irrelevant' | 'watch' | 'ignore' | 'tried'

export type IntelligenceHome = {
  todayChanges?: ImpactCard[]
  whatChanged: { eventId: number; eventTitle?: string; at: string; label: string; note?: string }[]
  whyCare?: ImpactCard[]
  impacts?: ImpactCard[]
  actions?: ActionCard[]
  opportunities?: OpportunityCard[]
  risks?: OpportunityCard[]
  whatToWatch: ImpactCard[]
  outcomeSummary?: OutcomeSummary
  whatMatters: RadarEvent[]
  whatsEmerging: RadarEvent[]
  generatedAt?: string
}

export type BriefSummary = { date: string; size?: number; modifiedAt?: string }
export type BriefDetail = { date: string; markdown: string; items: Item[] }

export type WatchingEntry = {
  id: number
  at?: string
  label: string
  note?: string
}
export type WatchingGroup = {
  eventId: number
  title: string
  status?: string
  entryCount: number
  entries: WatchingEntry[]
}

export type Settings = {
  interestProfile: string
  summaryLanguage: string
  scoreThreshold: number
  maxItems: number
  lookbackHours: number
  fetchIntervalMs: number
  pushCron: string
  timezone: string
  uiBaseUrl: string
  pushOnlyWhenItems: boolean
  openaiBaseUrl: string
  openaiModel: string
  contextWindowTokens: number
  maxCompletionTokens: number
  aiParallelism: number
  fetchTimeoutMs: number
  openaiConfigured: boolean
  openaiApiKeyConfigured?: boolean
  feishuWebhookUrl: string
  feishuConfigured: boolean
  webhookUrl: string
  webhookConfigured: boolean
  webhookHeaders?: string
  smtpHost: string
  smtpPort: number
  smtpUsername: string
  smtpFrom: string
  smtpTo: string
  smtpStarttls: boolean
  smtpPasswordConfigured: boolean
  emailConfigured: boolean
  localTokenConfigured: boolean
  sourceWeights?: Record<string, number>
}

export type AiMonitorCall = {
  ts: string
  operation: string
  model: string
  promptTokens: number
  completionTokens: number
  contextWindow: number
  contextUsedPct: number
  latencyMs: number
  tokensPerSec: number | null
  truncated: boolean
  ok: boolean
  error: string | null
  promptPreview?: string | null
  responsePreview?: string | null
}

export type AiMonitorInFlight = {
  id: string
  operation: string
  model: string
  startedAt: string
  elapsedMs: number
  progressPct: number
  promptPreview: string
  responseSoFar?: string
  contextWindow: number
}

export type AiMonitorQueue = {
  itemsTotal?: number
  itemsDone?: number
  itemsRemaining?: number
  itemsPersisted?: number
  currentItemTitle?: string | null
  lastItemId?: number | null
  callsExpectedPerItem?: number
  aiParallelism?: number
}

export type AiMonitor = {
  callCount: number
  errorCount: number
  contextWindow: number | null
  lastTokensPerSec: number | null
  avgTokensPerSec: number | null
  lastContextUsed: number | null
  lastContextWindow: number | null
  lastContextUsedPct: number | null
  lastLatencyMs: number | null
  inFlight?: AiMonitorInFlight | null
  inFlights?: AiMonitorInFlight[]
  recent: AiMonitorCall[]
  queue?: AiMonitorQueue
  streaming?: boolean
}

export type FetchSourceProgress = {
  id: number
  name: string
  type: string
  status: 'pending' | 'running' | 'done' | 'error'
  startedAt?: string | null
  durationMs?: number | null
  itemCount?: number | null
  error?: string | null
}

export type FetchProgress = {
  running: boolean
  stage: string
  startedAt?: string | null
  elapsedMs: number
  error?: string | null
  message?: string | null
  sources: FetchSourceProgress[]
  totals: {
    total: number
    done: number
    running: number
    remaining: number
  }
  analysis?: AiMonitorQueue
  result?: {
    fetched?: number
    deduped?: number
    scored?: number
    kept?: number
    briefPath?: string
    durationMs?: number
  } | null
}

export type ConnectorConfigField = {
  key: string
  label: string
  type: string
  required: boolean
}

export type ConnectorDescriptor = {
  id: string
  displayName: string
  configFields: ConnectorConfigField[]
}

export const api = {
  health: () => request<{ status: string; db: string }>('/api/health'),
  items: async (q: string = '') => {
    const data = await request<Item[] | { items: Item[]; total: number; offset?: number; limit?: number }>(
      `/api/items${q}`,
    )
    if (Array.isArray(data)) {
      return { items: data, total: data.length }
    }
    return {
      items: data.items ?? [],
      total: data.total ?? data.items?.length ?? 0,
      offset: data.offset,
      limit: data.limit,
    }
  },
  patchItem: (id: number, body: { read?: boolean; saved?: boolean; dismissed?: boolean; notInterested?: boolean }) =>
    request<Item>(`/api/items/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  markAllRead: () => request<{ updated: number }>('/api/items/mark-all-read', { method: 'POST' }),
  batchItems: (body: { ids: number[]; read?: boolean; saved?: boolean }) =>
    request<{ updated: number }>('/api/items/batch', { method: 'POST', body: JSON.stringify(body) }),
  unreadCounts: () => request<Record<string, number>>('/api/items/unread-counts'),
  watchingTimeline: () =>
    request<{ groups: WatchingGroup[]; count: number }>('/api/watching/timeline'),
  itemDetail: (id: number) =>
    request<{
      id: number
      url: string
      title: string
      kind: 'zhihu' | 'plain'
      html?: string
      text?: string
      author?: string
      authorHeadline?: string
      voteup?: number
      commentCount?: number
      questionTitle?: string
      questionId?: number
      comments?: Array<{ author: string; content: string }>
    }>(`/api/items/${id}/detail`),
  searchItems: async (q: string, limit = 50) => {
    const data = await request<{ items: Item[]; total: number }>(
      `/api/items/search?q=${encodeURIComponent(q)}&limit=${limit}`,
    )
    return data
  },
  interestKeywords: () =>
    request<{ keywords: string[]; effectiveInterestProfile?: string }>('/api/items/interest-keywords'),
  preferenceKeywords: (kind?: 'like' | 'dislike') => {
    const q = kind ? `?kind=${kind}` : ''
    return request<{ keywords: PreferenceKeyword[] }>(`/api/preferences/keywords${q}`)
  },
  addPreferenceKeyword: (body: { kind: 'like' | 'dislike'; text: string }) =>
    request<PreferenceKeyword>('/api/preferences/keywords', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deletePreferenceKeyword: (id: number) =>
    request<{ ok: boolean }>(`/api/preferences/keywords/${id}`, { method: 'DELETE' }),
  sources: () => request<Source[]>('/api/sources'),
  source: (id: number) => request<Source>(`/api/sources/${id}`),
  createSource: (body: unknown) =>
    request<Source>('/api/sources', { method: 'POST', body: JSON.stringify(body) }),
  patchSource: (id: number, body: unknown) =>
    request<Source>(`/api/sources/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteSource: (id: number) =>
    request<void>(`/api/sources/${id}`, { method: 'DELETE' }),
  connectors: () => request<ConnectorDescriptor[]>('/api/connectors'),
  briefs: () => request<BriefSummary[]>('/api/briefs'),
  brief: (date: string) => request<BriefDetail>(`/api/briefs/${date}`),
  settings: () => request<Settings>('/api/settings'),
  saveSettings: (body: Partial<Settings>) =>
    request<Settings>('/api/settings', { method: 'PUT', body: JSON.stringify(body) }),
  aiMonitor: () => request<AiMonitor>('/api/ai/monitor'),
  aiMonitorStreamUrl: () => {
    const token = localStorage.getItem('localToken')
    const base = `${BASE}/api/ai/monitor/stream`
    return token ? `${base}?token=${encodeURIComponent(token)}` : base
  },
  fetchJob: (opts?: { sourceType?: string }) => {
    const q = opts?.sourceType ? `?sourceType=${encodeURIComponent(opts.sourceType)}` : ''
    return request<Record<string, unknown>>(`/api/jobs/fetch${q}`, { method: 'POST' })
  },
  fetchProgress: () => request<FetchProgress>('/api/jobs/fetch/progress'),
  pushJob: () => request<Record<string, unknown>>('/api/jobs/push', { method: 'POST' }),
  clusterJob: () => request<Record<string, unknown>>('/api/jobs/cluster', { method: 'POST' }),
  impactJob: () => request<Record<string, unknown>>('/api/jobs/impact', { method: 'POST' }),
  events: (q: string = '') => request<RadarEvent[]>(`/api/events${q}`),
  event: (id: number) => request<RadarEvent>(`/api/events/${id}`),
  changes: (limit: number = 40) => request<ChangeCard[]>(`/api/changes?limit=${limit}`),
  change: (id: number) => request<ChangeCard>(`/api/changes/${id}`),
  intelligenceHome: () => request<IntelligenceHome>('/api/intelligence/home'),
  getContext: () => request<UserContext>('/api/contexts'),
  saveContext: (body: unknown) =>
    request<UserContext>('/api/contexts', { method: 'PUT', body: JSON.stringify(body) }),
  extractContext: (text: string) =>
    request<{ payload: UserContext['payload']; rawText?: string; source?: string }>(
      '/api/contexts/extract',
      { method: 'POST', body: JSON.stringify({ text }) },
    ),
  importGithubContext: (url: string) =>
    request<{ payload: UserContext['payload']; rawText?: string; source?: string }>(
      '/api/contexts/import/github',
      { method: 'POST', body: JSON.stringify({ url }) },
    ),
  importMarkdownContext: (markdown: string) =>
    request<{ payload: UserContext['payload']; rawText?: string; source?: string }>(
      '/api/contexts/import/markdown',
      { method: 'POST', body: JSON.stringify({ markdown }) },
    ),
  actions: () => request<ActionCard[]>('/api/actions'),
  patchAction: (id: number, body: { status: string }) =>
    request<ActionCard>(`/api/actions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  postFeedback: (body: { targetType: 'change' | 'action'; targetId: number; kind: FeedbackKind }) =>
    request<Record<string, unknown>>('/api/feedback', { method: 'POST', body: JSON.stringify(body) }),
  experiments: () => request<ExperimentCard[]>('/api/experiments'),
  updateExperiment: (id: number, body: Record<string, unknown>) =>
    request<ExperimentCard>(`/api/experiments/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  outcomeSummary: () => request<OutcomeSummary>('/api/outcomes/summary'),
  importPack: (body: { packId?: string; path?: string }) =>
    request<Record<string, unknown>>('/api/packs/import', { method: 'POST', body: JSON.stringify(body) }),
}
