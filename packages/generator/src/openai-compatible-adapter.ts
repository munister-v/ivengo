import type { GenerationRequest, GeneratedPost, ContentType, RewriteRequest } from './types'
import { buildPrompt, buildRewritePrompt } from './prompts'

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
      choices?: { message?: { content?: string; reasoning?: string } }[]
    }
    const msg = data.choices?.[0]?.message
    // Prefer content; some reasoning models (r1, nemotron) put the answer in `reasoning`.
    return (msg?.content || msg?.reasoning || '').trim()
  }

  /**
   * Auto-switcher core. Tries every model, and for each model every key, until
   * `accept(raw)` returns a non-null value — which is then returned. Any failure —
   * a transport error (404 pulled/paywalled, 401/403 bad key, 402, 429/503
   * rate-limit, 5xx, network), an empty completion, OR output that `accept`
   * rejects — falls through to the next key, then the next model. Validation
   * happens INSIDE the loop on purpose: a model that returns garbage must not
   * abort the whole run while other models would succeed.
   */
  private async runSwitcher<T>(
    system: string,
    user: string,
    accept: (raw: string) => T | null,
    label: string
  ): Promise<T> {
    let lastErr: unknown
    for (const model of this.models) {
      for (const apiKey of this.apiKeys) {
        let raw: string
        try {
          raw = await this.callModel(model, apiKey, system, user)
        } catch (e) {
          lastErr = e
          continue
        }
        if (!raw) {
          lastErr = new Error(`Model ${model} returned an empty response`)
          continue
        }
        const result = accept(raw)
        if (result == null) {
          lastErr = new Error(`Model ${model} returned unusable output. Raw: ${raw.slice(0, 200)}`)
          continue
        }
        return result
      }
    }
    const detail = lastErr instanceof Error ? lastErr.message : String(lastErr)
    throw new Error(`Не вдалося ${label} — усі ${this.models.length} безкоштовних моделей зараз недоступні або повернули невалідну відповідь. Спробуйте ще раз за хвилину. Деталі: ${detail}`)
  }

  async generate(req: GenerationRequest): Promise<GeneratedPost[]> {
    const { system, user } = buildPrompt(req, req.count)
    const posts = await this.runSwitcher(
      system,
      user,
      (raw) => {
        const p = extractPosts(raw)
        return p && p.length ? p : null
      },
      'згенерувати пост'
    )
    return posts.map((p) => ({
      ...p,
      type: req.contentType as ContentType,
      language: req.language,
      ctaUrl: p.buttons?.[0]?.url ?? req.ctaUrl,
    }))
  }

  async rewrite(req: RewriteRequest): Promise<string> {
    const { system, user } = buildRewritePrompt(req)
    return this.runSwitcher(
      system,
      user,
      (raw) => cleanRewriteOutput(raw),
      'покращити текст'
    )
  }
}

/**
 * Cleans a rewrite/improve completion: strips code fences, <think> reasoning
 * blocks, common preambles, and surrounding quotes. Returns null when nothing
 * usable is left (so the switcher falls through to the next model).
 */
function cleanRewriteOutput(raw: string): string | null {
  let text = raw
    .replace(/```(?:markdown|md|json|text)?/gi, '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim()
  // Drop a leading "Here is the rewritten post:" style preamble line.
  text = text.replace(/^(here(?:'s| is)[^\n:]*:|ось[^\n:]*:|вот[^\n:]*:)\s*/i, '').trim()
  // Strip a single pair of wrapping quotes if the whole thing is quoted.
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith('«') && text.endsWith('»'))) {
    text = text.slice(1, -1).trim()
  }
  return text.length >= 2 ? text : null
}

/**
 * Best-effort extraction of a post array from a raw model completion. Handles:
 *  - clean JSON arrays
 *  - arrays wrapped in ```json … ``` code fences or prose / <think> reasoning
 *  - a single JSON object (wrapped into a one-element array)
 *  - trailing commas and other minor JSON defects from small models
 * Returns null when nothing usable can be recovered.
 */
function extractPosts(raw: string): GeneratedPost[] | null {
  // 1. Strip markdown code fences so the JSON inside is reachable.
  let text = raw.replace(/```(?:json)?/gi, '').trim()
  // 2. Drop a leading <think>…</think> block some reasoning models emit.
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

  const candidates: string[] = []
  // Prefer the widest [...] span (a JSON array of posts).
  const arrStart = text.indexOf('[')
  const arrEnd = text.lastIndexOf(']')
  if (arrStart !== -1 && arrEnd > arrStart) candidates.push(text.slice(arrStart, arrEnd + 1))
  // Fall back to a single {...} object → wrap into an array.
  const objStart = text.indexOf('{')
  const objEnd = text.lastIndexOf('}')
  if (objStart !== -1 && objEnd > objStart) candidates.push('[' + text.slice(objStart, objEnd + 1) + ']')

  for (const candidate of candidates) {
    const parsed = tryParse(candidate)
    if (parsed) {
      const posts = parsed.filter((p) => p && typeof p === 'object' && typeof (p as GeneratedPost).content === 'string' && (p as GeneratedPost).content.trim())
      if (posts.length) return posts as GeneratedPost[]
    }
  }
  return null
}

function tryParse(s: string): unknown[] | null {
  const attempts = [
    s,
    s.replace(/,\s*([\]}])/g, '$1'),                 // strip trailing commas
    s.replace(/,\s*([\]}])/g, '$1').replace(/[“”]/g, '"'), // smart quotes → "
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
