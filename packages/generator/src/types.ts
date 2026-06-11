export type ContentType =
  | 'short_post'
  | 'article'
  | 'poll'
  | 'review'
  | 'faq'
  | 'news'
  | 'responsible_gambling'
  | 'myth_fact'
  | 'user_story'
  | 'urgency_offer'
  | 'engagement_poll'

export type Language = 'uk' | 'ru'

export type Tone = 'neutral' | 'engaging' | 'educational' | 'entertaining' | 'serious' | 'hype'

export interface InlineButton {
  text: string
  url: string
}

export interface GenerationRequest {
  theme: string
  contentType: ContentType
  language: Language
  tone: Tone
  count: number
  ctaUrl?: string
  channelName?: string
  /** Themes recently used for this contentType — AI avoids repeating them */
  recentThemes?: string[]
  /** Channel-specific notes injected into the AI system prompt */
  promptNotes?: string
}

export interface GeneratedPost {
  title?: string
  content: string
  type: ContentType
  language: Language
  imageUrl?: string
  ctaUrl?: string
  buttons?: InlineButton[]
  poll?: {
    question: string
    options: string[]
    isAnonymous?: boolean
    allowsMultipleAnswers?: boolean
  }
}

export interface GenerationResult {
  posts: GeneratedPost[]
  batchId?: string
}
