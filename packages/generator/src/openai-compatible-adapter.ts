import type { GenerationRequest, GeneratedPost, ContentType } from './types'
import { buildPrompt } from './prompts'

/**
 * Works with any OpenAI-compatible chat-completions endpoint:
 * OpenRouter (https://openrouter.ai/api/v1), Ollama (http://localhost:11434/v1),
 * LM Studio, vLLM, etc.
 *
 * `models` is tried in order, and for each model every key in `apiKeys` is tried —
 * on a 401/429/503 (auth/rate-limit) the adapter falls through to the next
 * key, then the next model. Useful for OpenRouter ":free" models, which share
 * a rate-limited pool and frequently return 429, and for spreading load across
 * multiple OpenRouter accounts/keys.
 */
export class OpenAICompatibleAdapter {
  private apiKeys: (string | undefined)[]

  constructor(
    private baseUrl: string,
    apiKeys: string | string[] | undefined,
    private models: string[]
  ) {
    if (models.length === 0) throw new Error('OpenAICompatibleAdapter requires at least one model')
    this.apiKeys = Array.isArray(apiKeys) ? apiKeys : [apiKeys]
    if (this.apiKeys.length === 0) this.apiKeys = [undefined]
  }

  private async callModel(model: string, apiKey: string | undefined, system: string, user: string): Promise<string> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: 6000,
      }),
    })

    if (!res.ok) {
      const body = (await res.text()).slice(0, 300)
      const err = new Error(`AI provider error ${res.status} (model ${model}): ${body}`) as Error & { status?: number }
      err.status = res.status
      throw err
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    return data.choices?.[0]?.message?.content ?? ''
  }

  async generate(req: GenerationRequest): Promise<GeneratedPost[]> {
    const { system, user } = buildPrompt(req, req.count)

    let raw = ''
    let lastErr: unknown
    outer: for (const model of this.models) {
      for (const apiKey of this.apiKeys) {
        try {
          raw = await this.callModel(model, apiKey, system, user)
          lastErr = undefined
          break outer
        } catch (e) {
          lastErr = e
          const status = (e as { status?: number }).status
          // 401/403: bad/exhausted key — try next key. 429/503: rate-limited — try next key, then next model.
          if (status === 401 || status === 403 || status === 429 || status === 503) continue
          throw e
        }
      }
    }
    if (lastErr) throw lastErr

    const jsonMatch = raw.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      throw new Error(`AI returned no valid JSON array. Raw: ${raw.slice(0, 300)}`)
    }

    let parsed: GeneratedPost[]
    try {
      parsed = JSON.parse(jsonMatch[0]) as GeneratedPost[]
    } catch {
      // Smaller free models occasionally emit trailing commas — repair and retry once.
      const repaired = jsonMatch[0].replace(/,\s*([\]}])/g, '$1')
      try {
        parsed = JSON.parse(repaired) as GeneratedPost[]
      } catch (e2) {
        throw new Error(`AI returned malformed JSON: ${(e2 as Error).message}. Raw: ${jsonMatch[0].slice(0, 500)}`)
      }
    }

    return parsed.map((p) => ({
      ...p,
      type: req.contentType as ContentType,
      language: req.language,
      ctaUrl: p.buttons?.[0]?.url ?? req.ctaUrl,
    }))
  }
}
