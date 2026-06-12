import Anthropic from '@anthropic-ai/sdk'
import type { GenerationRequest, GeneratedPost, ContentType, RewriteRequest } from './types'
import { buildPrompt, buildRewritePrompt } from './prompts'

export class AnthropicAdapter {
  private client: Anthropic
  private model: string

  constructor(apiKey?: string, model?: string) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env.ANTHROPIC_API_KEY })
    this.model = model ?? process.env.AI_MODEL ?? 'claude-sonnet-4-6'
  }

  private async complete(system: string, user: string): Promise<string> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: 6000,
      system,
      messages: [{ role: 'user', content: user }],
    })
    return message.content[0]?.type === 'text' ? message.content[0].text : ''
  }

  async generate(req: GenerationRequest): Promise<GeneratedPost[]> {
    const { system, user } = buildPrompt(req, req.count)
    const raw = await this.complete(system, user)

    // Bulletproof parsing: same best-effort extraction as the OpenRouter
    // adapter (strip fences/reasoning, recover arrays/objects, repair commas
    // and smart quotes) so a slightly-malformed reply doesn't abort the run.
    const posts = extractPosts(raw)
    if (!posts || posts.length === 0) {
      throw new Error(`AI returned no valid JSON array. Raw: ${raw.slice(0, 300)}`)
    }

    return posts.map((p) => ({
      ...p,
      type: req.contentType as ContentType,
      language: req.language,
      ctaUrl: p.buttons?.[0]?.url ?? req.ctaUrl,
    }))
  }

  async rewrite(req: RewriteRequest): Promise<string> {
    const { system, user } = buildRewritePrompt(req)
    const raw = await this.complete(system, user)
    const text = raw
      .replace(/```(?:markdown|md|json|text)?/gi, '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .trim()
    if (text.length < 2) throw new Error('AI returned an empty rewrite')
    return text
  }
}

/** Best-effort extraction of a post array from a raw completion (mirrors the OpenRouter adapter). */
function extractPosts(raw: string): GeneratedPost[] | null {
  let text = raw.replace(/```(?:json)?/gi, '').trim()
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

  const candidates: string[] = []
  const arrStart = text.indexOf('[')
  const arrEnd = text.lastIndexOf(']')
  if (arrStart !== -1 && arrEnd > arrStart) candidates.push(text.slice(arrStart, arrEnd + 1))
  const objStart = text.indexOf('{')
  const objEnd = text.lastIndexOf('}')
  if (objStart !== -1 && objEnd > objStart) candidates.push('[' + text.slice(objStart, objEnd + 1) + ']')

  for (const candidate of candidates) {
    const parsed = tryParse(candidate)
    if (parsed) {
      const posts = parsed.filter(
        (p) =>
          p &&
          typeof p === 'object' &&
          typeof (p as GeneratedPost).content === 'string' &&
          (p as GeneratedPost).content.trim()
      )
      if (posts.length) return posts as GeneratedPost[]
    }
  }
  return null
}

function tryParse(s: string): unknown[] | null {
  const attempts = [
    s,
    s.replace(/,\s*([\]}])/g, '$1'),
    s.replace(/,\s*([\]}])/g, '$1').replace(/[“”]/g, '"'),
  ]
  for (const a of attempts) {
    try {
      const v = JSON.parse(a)
      if (Array.isArray(v)) return v
    } catch {
      // try next repair
    }
  }
  return null
}
