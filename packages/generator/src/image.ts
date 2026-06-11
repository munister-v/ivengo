/**
 * Free AI image generation via the AI Horde (stablehorde.net) — a
 * crowdsourced Stable Diffusion cluster that's free to use anonymously
 * (apikey "0000000000"), no signup or payment required.
 *
 * Generation is async: submit a job, poll until it's done, then fetch the
 * resulting image (hosted temporarily on Cloudflare R2). The caller is
 * expected to download and persist that image promptly (the R2 link expires
 * after ~30 minutes).
 */

export interface ImageGenOptions {
  /** Image width in px (default 512, must be a multiple of 64). */
  width?: number
  /** Image height in px (default 512, must be a multiple of 64). */
  height?: number
  /** Diffusion steps (default 20). */
  steps?: number
  /** Max time to wait for the job to finish, in ms (default 150000). */
  timeoutMs?: number
  /** Poll interval, in ms (default 4000). */
  pollMs?: number
}

const HORDE_BASE = process.env.IMAGE_GEN_BASE_URL ?? 'https://stablehorde.net/api/v2'
const HORDE_API_KEY = process.env.STABLE_HORDE_API_KEY ?? '0000000000'

function clampDim(n: number): number {
  const clamped = Math.max(192, Math.min(1024, Math.round(n)))
  return Math.round(clamped / 64) * 64
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface HordeCheckResponse {
  done?: boolean
  faulted?: boolean
  queue_position?: number
  wait_time?: number
}

interface HordeStatusResponse {
  generations?: { img: string }[]
  faulted?: boolean
}

/** Submits a generation job to the AI Horde. Returns the job id. */
export async function submitImageJob(prompt: string, opts: ImageGenOptions = {}): Promise<string> {
  const res = await fetch(`${HORDE_BASE}/generate/async`, {
    method: 'POST',
    headers: { apikey: HORDE_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      params: {
        width: clampDim(opts.width ?? 512),
        height: clampDim(opts.height ?? 512),
        steps: opts.steps ?? 20,
        sampler_name: 'k_euler',
        cfg_scale: 7,
        n: 1,
      },
      r2: true,
      nsfw: false,
    }),
  })
  const data = (await res.json()) as { id?: string; message?: string }
  if (!res.ok || !data.id) {
    throw new Error(data.message ?? `Image generation request failed (${res.status})`)
  }
  return data.id
}

/** Polls the AI Horde until the job is done (or faulted/timed out), then returns the image URL. */
export async function generateImage(prompt: string, opts: ImageGenOptions = {}): Promise<string> {
  const id = await submitImageJob(prompt, opts)
  const timeout = opts.timeoutMs ?? 150_000
  const pollMs = opts.pollMs ?? 4000
  const deadline = Date.now() + timeout

  while (Date.now() < deadline) {
    await sleep(pollMs)
    const checkRes = await fetch(`${HORDE_BASE}/generate/check/${id}`)
    const check = (await checkRes.json()) as HordeCheckResponse
    if (check.faulted) throw new Error('Image generation failed (worker fault)')
    if (check.done) {
      const statusRes = await fetch(`${HORDE_BASE}/generate/status/${id}`)
      const status = (await statusRes.json()) as HordeStatusResponse
      const img = status.generations?.[0]?.img
      if (!img) throw new Error('Image generation finished but returned no image')
      return img
    }
  }
  throw new Error('Image generation timed out — спробуйте ще раз (черга AI Horde переповнена)')
}
