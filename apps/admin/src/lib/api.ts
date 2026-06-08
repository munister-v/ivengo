const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('ivengo_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

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
  testChannel: (id: string) =>
    request<{ success: boolean }>(`/api/channels/${id}/test`, { method: 'POST' }),

  // Logs
  getLogs: (params: { status?: string; page?: number } = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([k, v]) => v && qs.set(k, String(v)))
    return request<LogsResponse>(`/api/logs?${qs}`)
  },
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
  createdAt: string
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
}
