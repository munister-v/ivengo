import { getToken, removeToken, loginPath } from './auth'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      // Only set Content-Type when there's an actual body — Fastify rejects
      // POST/PATCH requests that declare application/json but send no body
      // (e.g. approve/publish) with a 400 "Body cannot be empty" error.
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  // Token expired or invalid → clear it and send the user to login once,
  // instead of leaving the app stuck behind a dead token. The login request
  // itself is exempt (a wrong password there is a normal 401).
  if (res.status === 401 && !path.includes('/auth/login')) {
    removeToken()
    if (typeof window !== 'undefined') {
      window.location.href = loginPath()
    }
    throw new Error('Сесія завершилась — увійдіть знову')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  // Auth
  login: (password: string) =>
    request<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  // Stats
  getStats: () => request<StatsData>('/api/stats'),

  // Posts
  getPosts: (params: PostFilters = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => v && qs.set(k, String(v)))
    return request<PostsResponse>(`/api/posts?${qs}`)
  },
  getPost: (id: string) => request<Post>(`/api/posts/${id}`),
  getCalendar: (from: string, to: string) =>
    request<{ posts: CalendarPost[] }>(`/api/posts/calendar?from=${from}&to=${to}`),
  getAbGroups: () => request<{ groups: AbGroup[] }>('/api/posts/ab-groups'),
  createPost: (data: Partial<Post>) =>
    request<Post>('/api/posts', { method: 'POST', body: JSON.stringify(data) }),
  updatePost: (id: string, data: Partial<Post>) =>
    request<Post>(`/api/posts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePost: (id: string) => request<void>(`/api/posts/${id}`, { method: 'DELETE' }),
  approvePost: (id: string) =>
    request<Post>(`/api/posts/${id}/approve`, { method: 'POST' }),
  rejectPost: (id: string, reason?: string) =>
    request<Post>(`/api/posts/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
  schedulePost: (id: string, scheduledAt: string) =>
    request<Post>(`/api/posts/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt }),
    }),
  publishPost: (id: string) =>
    request<{ success: boolean; telegramMessageId: string }>(`/api/posts/${id}/publish`, {
      method: 'POST',
    }),
  checkCompliance: (id: string) =>
    request<ComplianceResult>(`/api/posts/${id}/compliance`, { method: 'POST' }),
  rewriteText: (data: { text: string; instruction: string; language: 'uk' | 'ru' }) =>
    request<{ text: string }>('/api/posts/rewrite', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Batches
  generateBatch: (data: GenerateRequest) =>
    request<{ batch: Batch; posts: Post[] }>('/api/batches/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getBatches: () => request<BatchWithCount[]>('/api/batches'),

  // Channels
  getChannels: () => request<Channel[]>('/api/channels'),
  createChannel: (data: Partial<Channel>) =>
    request<Channel>('/api/channels', { method: 'POST', body: JSON.stringify(data) }),
  updateChannel: (id: string, data: Partial<Channel>) =>
    request<Channel>(`/api/channels/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteChannel: (id: string) =>
    request<void>(`/api/channels/${id}`, { method: 'DELETE' }),
  testChannel: (id: string) =>
    request<{ success: boolean }>(`/api/channels/${id}/test`, { method: 'POST' }),
  validateChannel: (data: { botToken: string; chatId: string }) =>
    request<ChannelValidation>('/api/channels/validate', { method: 'POST', body: JSON.stringify(data) }),

  // Logs
  getLogs: (params: { status?: string; page?: number } = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => v && qs.set(k, String(v)))
    return request<LogsResponse>(`/api/logs?${qs}`)
  },

  // Monitoring
  getHealth: () => request<HealthResponse>('/api/monitoring/health'),
  getQueue: () => request<QueueResponse>('/api/monitoring/queue'),
  getMonitoringErrors: () => request<{ errors: PublicationLog[] }>('/api/monitoring/errors'),

  // Analytics
  getAnalyticsOverview: () => request<AnalyticsOverview>('/api/analytics/overview'),

  // Media
  getMedia: () => request<MediaAsset[]>('/api/media'),
  createMedia: (data: { url: string; name?: string; tags?: string }) =>
    request<MediaAsset>('/api/media', { method: 'POST', body: JSON.stringify(data) }),
  deleteMedia: (id: string) => request<void>(`/api/media/${id}`, { method: 'DELETE' }),
  generateImage: (data: { prompt: string; width?: number; height?: number; negativePrompt?: string; model?: string }) =>
    request<{ url: string; prompt: string }>('/api/media/generate-image', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Custom (premium) emoji
  getCustomEmoji: () => request<CustomEmoji[]>('/api/custom-emoji'),
  createCustomEmoji: (data: Partial<CustomEmoji>) =>
    request<CustomEmoji>('/api/custom-emoji', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomEmoji: (id: string, data: Partial<CustomEmoji>) =>
    request<CustomEmoji>(`/api/custom-emoji/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCustomEmoji: (id: string) =>
    request<void>(`/api/custom-emoji/${id}`, { method: 'DELETE' }),
  verifyCustomEmoji: (ids: string[], channelId?: string) =>
    request<{ results: CustomEmojiVerifyResult[] }>('/api/custom-emoji/verify', {
      method: 'POST',
      body: JSON.stringify({ ids, channelId }),
    }),
}

// Types
export interface Post {
  id: string
  title?: string
  content: string
  type: string
  language: string
  status: string
  scheduledAt?: string
  publishedAt?: string
  telegramMessageId?: string
  imageUrl?: string
  ctaUrl?: string
  buttons?: { text: string; url: string }[]
  abGroupId?: string
  abVariant?: string
  channelIds?: string[]
  retryCount: number
  complianceChecks?: ComplianceCheck[]
  poll?: Poll
  publicationLogs?: PublicationLog[]
  createdAt: string
  updatedAt: string
}

export interface Poll {
  id: string
  question: string
  options: string[]
  isAnonymous: boolean
  allowsMultipleAnswers: boolean
  correctOptionId?: number
}

export interface ComplianceCheck {
  id: string
  passed: boolean
  flags: ComplianceFlag[]
  checkedAt: string
}

export interface ComplianceFlag {
  rule: string
  severity: 'low' | 'medium' | 'high'
  match: string
  description: string
}

export interface ComplianceResult {
  passed: boolean
  flags: ComplianceFlag[]
}

export interface Channel {
  id: string
  name: string
  chatId: string
  botToken: string
  isActive: boolean
  description?: string
  premiumEmoji?: boolean
  createdAt: string
}

export interface ChannelValidation {
  normalizedChatId?: string
  bot: { username?: string; name: string }
  chat: { title?: string; username?: string; type: string }
  memberStatus: string | null
  canPost: boolean | null
  warning?: string
}

export interface CustomEmoji {
  id: string
  label: string
  customEmojiId: string
  fallback: string
  category: string
  setName?: string
  isAnimated: boolean
  createdAt: string
}

export interface CustomEmojiVerifyResult {
  customEmojiId: string
  valid: boolean
  emoji: string | null
  setName: string | null
  isAnimated: boolean
}

/** Build the [ce:id:fallback] placeholder for inserting a premium emoji into content. */
export function emojiPlaceholder(e: Pick<CustomEmoji, 'customEmojiId' | 'fallback'>): string {
  return `[ce:${e.customEmojiId}:${e.fallback}]`
}

export interface Batch {
  id: string
  theme: string
  contentType: string
  language: string
  tone: string
  count: number
  status: string
  createdAt: string
}

export interface BatchWithCount extends Batch {
  _count: { posts: number }
}

export interface PublicationLog {
  id: string
  action: string
  status: string
  error?: string
  telegramMessageId?: string
  createdAt: string
  post?: { id: string; title?: string; type: string }
  channel?: { name: string; chatId: string }
}

export interface StatsData {
  totalPosts: number
  byStatus: Record<string, number>
  publishedToday: number
  failedToday: number
  recentActivity: PublicationLog[]
}

export interface PostFilters {
  status?: string
  type?: string
  language?: string
  page?: number
  limit?: number
}

export interface PostsResponse {
  posts: Post[]
  total: number
  page: number
  limit: number
}

export interface LogsResponse {
  logs: PublicationLog[]
  total: number
  page: number
  limit: number
}

export interface GenerateRequest {
  theme: string
  contentType: string
  language: string
  tone: string
  count: number
  ctaUrl?: string
  channelName?: string
  channelIds?: string[]
  autoSchedule?: { startAt: string; intervalHours: number }
}

export interface HealthCheck {
  name: string
  ok: boolean
  detail?: string
  latencyMs?: number
}

export interface HealthResponse {
  ok: boolean
  checks: HealthCheck[]
  ts: string
}

export interface AbGroupVariant {
  id: string
  title?: string
  type: string
  status: string
  abVariant?: string
  scheduledAt?: string
  publishedAt?: string
  publishCount: number
}

export interface AbGroup {
  abGroupId: string
  variants: AbGroupVariant[]
}

export interface CalendarPost {
  id: string
  title?: string
  type: string
  status: string
  language: string
  scheduledAt?: string
  publishedAt?: string
}

export interface AnalyticsOverview {
  perDay: { date: string; count: number }[]
  byType: Record<string, number>
  byLanguage: Record<string, number>
  byStatus: Record<string, number>
  successRate: { success: number; error: number; total: number }
  channelStats: Record<string, { success: number; error: number }>
  windowDays: number
}

export interface MediaAsset {
  id: string
  url: string
  name?: string
  tags?: string
  createdAt: string
}

export interface QueueResponse {
  scheduled: number
  pendingReview: number
  failed: number
  processingBatches: number
  overdue: number
  nextScheduled?: { id: string; title?: string; scheduledAt: string; type: string } | null
}
