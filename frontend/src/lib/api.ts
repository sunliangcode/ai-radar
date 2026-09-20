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
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers })
  } catch (err) {
    // Backend not running / offline / DNS failure: make this a typed, localizable
    // error instead of leaking the browser's raw "Failed to fetch".
    const detail = err instanceof Error ? err.message : String(err)
    throw new ApiError(0, 'network', detail)
  }
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
  primarySourceId?: string
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
  changeId?: number
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
  changeSummary?: string
  score?: number
  status?: string
  recentTimeline?: TimelineSnippet[]
  firstDetectedAt?: string
  lastUpdatedAt?: string
  watched?: boolean
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
  sourceIds?: number[]
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

export type ChatMessage = { role: 'user' | 'assistant' | 'system'; content: string }

export type ChatCitedChange = {
  id: number
  title?: string
  summary?: string
  why?: string
  tier?: string
  recommendation?: string
}

export type ChatTurnResult = {
  reply: string
  newlyCited: ChatCitedChange[]
  citedChangeIds: number[]
}

export type UserContext = {
  id?: number
  payload: {
    profile?: { role?: string; summary?: string }
    projects?: { name?: string; type?: string; stack?: string[]; url?: string }[]
    technologies?: string[]
    interests?: string[]
    goals?: string[]
    current_focus?: string[]
    explicit_ignore?: string[]
    watching_topics?: string[]
    preferences?: Record<string, unknown>
    weights?: Record<string, number>
    schemaVersion?: number
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
  /** News source ids linked to this change (for UI filtering). */
  sourceIds?: number[]
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

export type TimelineSnippet = {
  at?: string
  label: string
  note?: string
  newsItemId?: number
}

export type DecisionRecord = {
  id: number
  changeId: number
  kind: string
  reason?: string
  revisitAt?: string
  status?: string
  changeTitle?: string
  changeSummary?: string
  updatesSinceDecision?: number
  createdAt?: string
  sourceIds?: number[]
}

export type ProactiveAlert = {
  changeId?: number
  timelineId?: number
  at?: string
  label?: string
  note?: string
  title?: string
}

export type IntelligenceHome = {
  majorChanges?: ImpactCard[]
  minorSignals?: ImpactCard[]
  decisionsToRevisit?: DecisionRecord[]
  proactiveAlerts?: ProactiveAlert[]
  stats?: { majorCount?: number; minorCount?: number; decisionsDue?: number }
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
  sourceIds?: number[]
  entries: WatchingEntry[]
}

export type Settings = {
  interestProfile: string
  summaryLanguage: string
  pushCron: string
  timezone: string
  pushOnlyWhenItems: boolean
  smtpTo: string
  emailTransportReady: boolean
  emailConfigured: boolean
  feishuBound: boolean
  feishuBindAvailable: boolean
  feishuConfigured: boolean
  openaiConfigured: boolean
  openaiApiKeyConfigured?: boolean
  openaiBaseUrl?: string
  openaiModel?: string
  localTokenConfigured?: boolean
  uiBaseUrl?: string
  fetchIntervalMs?: number
  scoreThreshold?: number
  maxItems?: number
  lookbackHours?: number
  fetchTimeoutMs?: number
  contextWindowTokens?: number
  maxCompletionTokens?: number
  aiParallelism?: number
  retentionDays?: number
  sourceWeights?: Record<string, number>
  webhookConfigured?: boolean
  smtpPasswordConfigured?: boolean
}

export type FeishuBindStatus = {
  sessionId: string
  status: 'pending' | 'waiting_scan' | 'bound' | 'failed' | 'expired' | string
  qrUrl?: string
  expiresIn?: number
  error?: string
  welcomeHint?: boolean
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

export type TranslateHealth = {
  enabled: boolean
  baseUrl: string
  status: 'up' | 'down' | 'disabled' | string
  error?: string
}

export type LlmHealth = {
  ready: boolean
  mode: 'ai' | 'heuristic' | 'degraded' | string
  model: string
  baseUrl: string
  local: boolean
  hasApiKey: boolean
  ok: boolean
  successCount?: number
  failureCount?: number
  lastSuccessAt?: string | null
  lastError?: string | null
  lastErrorAt?: string | null
  lastErrorOp?: string | null
}

export type LlmProbe = {
  ok: boolean
  model?: string
  baseUrl?: string
  latencyMs?: number
  models?: string[]
  modelPresent?: boolean
  hint?: string
  error?: string
}

export type Health = {
  status: string
  db: string
  translate?: TranslateHealth
  llm?: LlmHealth
  error?: string
}

export type JobsSchedule = {
  fetchIntervalMs: number
  pushCron: string
  timezone: string
  clusterIntervalMs?: number
  nextFetchAt?: string | null
  nextPushAt?: string | null
  nextClusterAt?: string | null
  lastFetchAt?: string | null
  lastPushAt?: string | null
  lastClusterAt?: string | null
  pushCronError?: string | null
  running?: boolean
}

export const api = {
  health: () => request<Health>('/api/health'),
  llmProbe: () => request<LlmProbe>('/api/health/llm'),
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
  searchItems: async (q: string, limit = 50, sourceIds?: string) => {
    const params = new URLSearchParams({ q, limit: String(limit) })
    if (sourceIds) params.set('sourceIds', sourceIds)
    const data = await request<{ items: Item[]; total: number }>(
      `/api/items/search?${params}`,
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
  feishuBindStart: () =>
    request<FeishuBindStatus>('/api/delivery/feishu/bind/start', { method: 'POST' }),
  feishuBindStatus: (sessionId: string) =>
    request<FeishuBindStatus>(`/api/delivery/feishu/bind/${encodeURIComponent(sessionId)}`),
  feishuUnbind: () =>
    request<{ ok: boolean; feishuBound: boolean }>('/api/delivery/feishu/bind', { method: 'DELETE' }),
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
  jobsSchedule: () => request<JobsSchedule>('/api/jobs/schedule'),
  pushJob: () => request<Record<string, unknown>>('/api/jobs/push', { method: 'POST' }),
  clusterJob: () => request<Record<string, unknown>>('/api/jobs/cluster', { method: 'POST' }),
  impactJob: () => request<Record<string, unknown>>('/api/jobs/impact', { method: 'POST' }),
  cleanupJob: () => request<Record<string, unknown>>('/api/jobs/cleanup', { method: 'POST' }),
  events: (q: string = '') => request<RadarEvent[]>(`/api/events${q}`),
  event: (id: number) => request<RadarEvent>(`/api/events/${id}`),
  changes: (limit: number = 40, tier?: string) => {
    const params = new URLSearchParams({ limit: String(limit) })
    if (tier) params.set('tier', tier)
    return request<ChangeCard[]>(`/api/changes?${params}`)
  },
  change: (id: number) => request<ChangeCard>(`/api/changes/${id}`),
  dismissChange: (id: number) =>
    request<{ changeId: number; dismissed: boolean }>(`/api/changes/${id}/dismiss`, { method: 'POST' }),
  postChangeDecision: (
    id: number,
    body: { kind: string; reason?: string; revisitAt?: string },
  ) =>
    request<DecisionRecord>(`/api/changes/${id}/decisions`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  putWatch: (changeId: number, rules: Record<string, boolean>) =>
    request<Record<string, unknown>>(`/api/watch/${changeId}`, {
      method: 'PUT',
      body: JSON.stringify(rules),
    }),
  decisions: (revisit?: 'due') =>
    request<DecisionRecord[]>(`/api/decisions${revisit ? '?revisit=due' : ''}`),
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
  chatStream: async (
    body: { messages: ChatMessage[]; citedChangeIds?: number[]; seedChangeId?: number },
    opts?: { signal?: AbortSignal; onDelta?: (delta: string) => void },
  ): Promise<ChatTurnResult> => {
    const headers = new Headers({
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    })
    const token = localStorage.getItem('localToken')
    if (token) headers.set('X-Local-Token', token)

    let res: Response
    try {
      res = await fetch(`${BASE}/api/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: opts?.signal,
      })
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err)
      throw new ApiError(0, 'network', detail)
    }
    if (!res.ok) {
      let message = res.statusText
      try {
        const j = await res.json()
        message = j.message ?? message
      } catch {
        /* ignore */
      }
      throw new ApiError(res.status, 'error', message)
    }
    if (!res.body) {
      throw new ApiError(0, 'error', 'empty chat stream')
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let result: ChatTurnResult = { reply: '', newlyCited: [], citedChangeIds: body.citedChangeIds ?? [] }
    let eventName = 'message'

    const handleBlock = (block: string) => {
      const lines = block.split('\n')
      let data = ''
      let name = eventName
      for (const line of lines) {
        if (line.startsWith('event:')) name = line.slice(6).trim()
        else if (line.startsWith('data:')) data += (data ? '\n' : '') + line.slice(5).trimStart()
      }
      if (!data) return
      if (name === 'delta') {
        // Spring may JSON-encode strings
        let delta = data
        try {
          const parsed = JSON.parse(data)
          if (typeof parsed === 'string') delta = parsed
        } catch {
          /* raw */
        }
        opts?.onDelta?.(delta)
        result = { ...result, reply: result.reply + delta }
      } else if (name === 'done') {
        try {
          const parsed = JSON.parse(data) as ChatTurnResult
          result = {
            reply: parsed.reply ?? result.reply,
            newlyCited: parsed.newlyCited ?? [],
            citedChangeIds: parsed.citedChangeIds ?? result.citedChangeIds,
          }
        } catch {
          /* ignore */
        }
      } else if (name === 'error') {
        let message = data
        try {
          const parsed = JSON.parse(data) as { message?: string }
          message = parsed.message ?? data
        } catch {
          /* ignore */
        }
        throw new ApiError(500, 'error', message)
      }
      eventName = 'message'
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''
      for (const part of parts) {
        if (part.trim()) handleBlock(part)
      }
    }
    if (buffer.trim()) handleBlock(buffer)
    return result
  },
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
