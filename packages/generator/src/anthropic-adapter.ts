import Anthropic from '@anthropic-ai/sdk'
import type { GenerationRequest, GeneratedPost, ContentType } from './types'

const LANG_LABELS: Record<string, string> = {
  uk: 'Ukrainian (Українська)',
  ru: 'Russian (Русский)',
}

const TYPE_INSTRUCTIONS: Record<string, string> = {
  short_post: 'A short engaging Telegram post (150-400 chars) with emojis.',
  article: 'A longer informative article post (600-1200 chars) with structured sections.',
  poll: 'A poll post. Include "poll" key with question and 2-4 options array.',
  review: 'A casino game or platform review post (400-800 chars).',
  faq: 'A FAQ post answering a common question about online casinos.',
  news: 'A news-style post about online casino industry.',
  responsible_gambling:
    'A responsible gambling awareness post. Must include 18+ warning. No promotion.',
  myth_fact: 'A "Myth vs Fact" post debunking a common casino misconception.',
}

const TONE_LABELS: Record<string, string> = {
  neutral: 'neutral and informative',
  engaging: 'engaging and fun',
  educational: 'educational and clear',
  entertaining: 'entertaining and witty',
  serious: 'serious and professional',
}

export class AnthropicAdapter {
  private client: Anthropic

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY })
  }

  async generate(req: GenerationRequest): Promise<GeneratedPost[]> {
    const typeInstructions = TYPE_INSTRUCTIONS[req.contentType] ?? TYPE_INSTRUCTIONS.short_post
    const langLabel = LANG_LABELS[req.language] ?? 'Ukrainian'
    const toneLabel = TONE_LABELS[req.tone] ?? 'neutral'

    const systemPrompt = `You are an expert content writer for a Telegram channel about online casinos.
Write content in ${langLabel}. Tone: ${toneLabel}.
Always follow responsible gambling guidelines. Never guarantee wins. Always include 18+ if promotional.
Return ONLY a valid JSON array of post objects. Each object must have:
- "title": optional string (short heading)
- "content": string (the post text, use Telegram Markdown)
- "type": "${req.contentType}"
- "language": "${req.language}"
${req.contentType === 'poll' ? '- "poll": { "question": string, "options": string[] (2-4 items), "isAnonymous": true }' : ''}
No extra text outside the JSON array.`

    const userPrompt = `Generate ${req.count} unique Telegram posts.
Theme: ${req.theme}
Type: ${typeInstructions}
Count: ${req.count}`

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error('AI returned no valid JSON array')
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedPost[]
    return parsed.map((p) => ({
      ...p,
      type: req.contentType as ContentType,
      language: req.language,
    }))
  }
}
