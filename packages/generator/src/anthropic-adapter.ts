import Anthropic from '@anthropic-ai/sdk'
import type { GenerationRequest, GeneratedPost, ContentType } from './types'
import { buildPrompt } from './prompts'

export class AnthropicAdapter {
  private client: Anthropic
  private model: string

  constructor(apiKey?: string, model?: string) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY })
    this.model = model ?? process.env.AI_MODEL ?? 'claude-sonnet-4-6'
  }

  async generate(req: GenerationRequest): Promise<GeneratedPost[]> {
    const { system, user } = buildPrompt(req, req.count)

    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 6000,
      system,
      messages: [{ role: 'user', content: user }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error(`AI returned no valid JSON array. Raw: ${raw.slice(0, 300)}`)
    }

    const parsed = JSON.parse(jsonMatch[0]) as GeneratedPost[]

    return parsed.map((p) => ({
      ...p,
      type: req.contentType as ContentType,
      language: req.language,
      ctaUrl: p.buttons?.[0]?.url ?? req.ctaUrl,
    }))
  }
}
