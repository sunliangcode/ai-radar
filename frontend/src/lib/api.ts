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
  canonicalUrl: string
  score?: number
  scoreReason?: string
  summary?: string
  tags?: string[]
  category?: string
  publishedAt?: string
  sourceRefs?: string[]
  primarySourceType?: string
  read?: boolean
  saved?: boolean
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

export type IntelligenceHome = {
  whatChanged: { eventId: number; eventTitle?: string; at: string; label: string; note?: string }[]
  whatMatters: RadarEvent[]
  whatsEmerging: RadarEvent[]
  whatToWatch: RadarEvent[]
  generatedAt?: string
}

export type BriefSummary = { date: string; size?: number; modifiedAt?: string }
export type BriefDetail = { date: string; markdown: string; items: Item[] }

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
  openaiConfigured: boolean
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
}

export const api = {
  health: () => request<{ status: string; db: string }>('/api/health'),
  items: (q: string = '') => request<Item[]>(`/api/items${q}`),
  patchItem: (id: number, body: { read?: boolean; saved?: boolean }) =>
    request<Item>(`/api/items/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  markAllRead: () => request<{ updated: number }>('/api/items/mark-all-read', { method: 'POST' }),
  sources: () => request<Source[]>('/api/sources'),
  source: (id: number) => request<Source>(`/api/sources/${id}`),
  createSource: (body: unknown) =>
    request<Source>('/api/sources', { method: 'POST', body: JSON.stringify(body) }),
  patchSource: (id: number, body: unknown) =>
    request<Source>(`/api/sources/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteSource: (id: number) =>
    request<void>(`/api/sources/${id}`, { method: 'DELETE' }),
  briefs: () => request<BriefSummary[]>('/api/briefs'),
  brief: (date: string) => request<BriefDetail>(`/api/briefs/${date}`),
  settings: () => request<Settings>('/api/settings'),
  saveSettings: (body: Partial<Settings>) =>
    request<Settings>('/api/settings', { method: 'PUT', body: JSON.stringify(body) }),
  fetchJob: () => request<Record<string, unknown>>('/api/jobs/fetch', { method: 'POST' }),
  pushJob: () => request<Record<string, unknown>>('/api/jobs/push', { method: 'POST' }),
  clusterJob: () => request<Record<string, unknown>>('/api/jobs/cluster', { method: 'POST' }),
  events: (q: string = '') => request<RadarEvent[]>(`/api/events${q}`),
  event: (id: number) => request<RadarEvent>(`/api/events/${id}`),
  intelligenceHome: () => request<IntelligenceHome>('/api/intelligence/home'),
  importPack: (body: { packId?: string; path?: string }) =>
    request<Record<string, unknown>>('/api/packs/import', { method: 'POST', body: JSON.stringify(body) }),
}
