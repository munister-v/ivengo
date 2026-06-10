import { AnthropicAdapter } from './anthropic-adapter'
import { OpenAICompatibleAdapter } from './openai-compatible-adapter'
import type { GenerationRequest, GeneratedPost } from './types'

export interface ContentAdapter {
  generate(req: GenerationRequest): Promise<GeneratedPost[]>
}

const FREE_OPENROUTER_FALLBACKS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'nousresearch/hermes-3-llama-3.1-405b:free',
  'liquid/lfm-2.5-1.2b-instruct:free',
]

function parseModelList(envValue: string | undefined, fallback: string[]): string[] {
  if (!envValue) return fallback
  return envValue.split(',').map((m) => m.trim()).filter(Boolean)
}

function parseKeyList(envValue: string | undefined): string[] | undefined {
  if (!envValue) return undefined
  const keys = envValue.split(',').map((k) => k.trim()).filter(Boolean)
  return keys.length ? keys : undefined
}

/**
 * Picks the AI provider from env vars — switch without code changes:
 *
 *   AI_PROVIDER=anthropic   (default) — needs ANTHROPIC_API_KEY, optional AI_MODEL (default claude-sonnet-4-6)
 *   AI_PROVIDER=openrouter  — needs OPENROUTER_API_KEY, optional AI_MODEL
 *   AI_PROVIDER=ollama      — local Llama via Ollama, optional OLLAMA_BASE_URL and AI_MODEL
 *
 * AI_MODEL accepts a comma-separated list — the adapter tries them in order
 * and falls through to the next on a 429 (rate limit). This is essential for
 * OpenRouter's ":free" models, which share a rate-limited pool across all
 * users and frequently return 429 — listing several spreads the load.
 * If unset for openrouter, a curated list of current free models is used.
 *
 * OPENROUTER_API_KEY also accepts a comma-separated list of keys (e.g. from
 * multiple OpenRouter accounts) — the adapter rotates through them on
 * 401/403/429/503 before moving on to the next model.
 */
export function createAdapter(): ContentAdapter {
  const provider = (process.env.AI_PROVIDER ?? 'anthropic').toLowerCase()

  switch (provider) {
    case 'openrouter':
      return new OpenAICompatibleAdapter(
        process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
        parseKeyList(process.env.OPENROUTER_API_KEY),
        parseModelList(process.env.AI_MODEL, FREE_OPENROUTER_FALLBACKS)
      )

    case 'ollama':
      return new OpenAICompatibleAdapter(
        process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
        undefined,
        parseModelList(process.env.AI_MODEL, ['llama3.1'])
      )

    case 'anthropic':
    default:
      return new AnthropicAdapter(process.env.ANTHROPIC_API_KEY, process.env.AI_MODEL)
  }
}
