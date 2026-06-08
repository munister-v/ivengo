export type ContentType =
  | 'short_post'
  | 'article'
  | 'poll'
  | 'review'
  | 'faq'
  | 'news'
  | 'responsible_gambling'
  | 'myth_fact'

export type Language = 'uk' | 'ru'

export type Tone = 'neutral' | 'engaging' | 'educational' | 'entertaining' | 'serious'

export interface GenerationRequest {
  theme: string
  contentType: ContentType
  language: Language
  tone: Tone
  count: number
}

export interface GeneratedPost {
  title?: string
  content: string
  type: ContentType
  language: Language
  poll?: {
    question: string
    options: string[]
    correctOptionId?: number
    isAnonymous?: boolean
  }
}

export interface GenerationResult {
  posts: GeneratedPost[]
  batchId?: string
}
