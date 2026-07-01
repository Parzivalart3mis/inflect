import { createHash } from 'node:crypto'

import { GoogleGenAI, Modality } from '@google/genai'
import { list, put } from '@vercel/blob'
import { NextResponse } from 'next/server'

import { ApiError, parseBody, requireUser, route } from '@/lib/api'
import { enforceRateLimit } from '@/lib/rate-limit'
import { ttsSchema } from '@/lib/validations'

const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts'
const DEFAULT_VOICE = 'Kore'
const SAMPLE_RATE = 24000
const RETRIES = 3

// Either auth path works: a classic read-write token, or Vercel's newer OIDC
// flow (BLOB_STORE_ID + a runtime-injected VERCEL_OIDC_TOKEN). @vercel/blob
// resolves whichever is present automatically.
const hasBlob =
  !!process.env.BLOB_READ_WRITE_TOKEN || !!process.env.BLOB_STORE_ID

function languageName(lang?: string): string | null {
  const part = (lang ?? '').slice(0, 2).toLowerCase()
  if (!part || part === 'en') return null
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(part) ?? null
  } catch {
    return null
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ---- Vercel Blob cache (each unique word/rule is generated once ever) ----
async function blobExists(hash: string): Promise<boolean> {
  if (!hasBlob) return false
  const pathname = `tts/${hash}.bin`
  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 })
    return blobs.some((b) => b.pathname === pathname)
  } catch {
    return false
  }
}

async function readCache(hash: string): Promise<string | null> {
  if (!hasBlob) return null
  const pathname = `tts/${hash}.bin`
  try {
    const { blobs } = await list({ prefix: pathname, limit: 1 })
    const hit = blobs.find((b) => b.pathname === pathname)
    if (!hit) return null
    const res = await fetch(hit.url)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer()).toString('base64')
  } catch {
    return null
  }
}

async function writeCache(hash: string, base64: string): Promise<void> {
  if (!hasBlob) return
  try {
    await put(`tts/${hash}.bin`, Buffer.from(base64, 'base64'), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/octet-stream',
    })
  } catch {
    // best-effort cache; never block playback
  }
}

async function generate(
  ai: GoogleGenAI,
  model: string,
  voiceName: string,
  prompt: string,
): Promise<string> {
  let lastErr: unknown
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      })
      const audio =
        res.data ?? res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
      if (audio) return audio
      lastErr = new Error('No audio returned')
    } catch (err) {
      lastErr = err
    }
    if (attempt < RETRIES - 1) await sleep(250 * (attempt + 1))
  }
  throw lastErr instanceof Error ? lastErr : new Error('TTS failed')
}

export const POST = route(async (request: Request) => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // Client falls back to the on-device voice when TTS isn't configured.
    throw new ApiError('tts_unconfigured', 'AI voice is not configured', 503)
  }

  const userId = await requireUser()
  const { text, lang, warm } = await parseBody(request, ttsSchema)
  await enforceRateLimit('tts', userId, 'Too many pronunciations this hour')

  const model = process.env.GEMINI_TTS_MODEL ?? DEFAULT_MODEL
  const voiceName = process.env.GEMINI_TTS_VOICE ?? DEFAULT_VOICE
  const name = languageName(lang)
  const prompt = name
    ? `Pronounce this ${name} word or phrase naturally, like a native speaker: ${text}`
    : `Say this clearly and naturally: ${text}`

  const hash = createHash('sha256')
    .update(`${model}|${voiceName}|${lang ?? ''}|${text}`)
    .digest('hex')

  const ai = new GoogleGenAI({ apiKey })

  // Pre-warm mode: only ensure the audio is cached; skip the audio payload.
  if (warm) {
    if (await blobExists(hash)) {
      return NextResponse.json({ cached: true })
    }
    let audio: string
    try {
      audio = await generate(ai, model, voiceName, prompt)
    } catch {
      throw new ApiError('tts_error', 'Could not synthesize audio', 502)
    }
    await writeCache(hash, audio)
    return NextResponse.json({ cached: false })
  }

  // Playback: serve from the durable Blob cache when we've spoken this before.
  const cached = await readCache(hash)
  if (cached) {
    return NextResponse.json({
      audio: cached,
      sampleRate: SAMPLE_RATE,
      cached: true,
    })
  }

  // Otherwise generate (with retries) and cache for next time.
  let audio: string
  try {
    audio = await generate(ai, model, voiceName, prompt)
  } catch {
    throw new ApiError('tts_error', 'Could not synthesize audio', 502)
  }

  void writeCache(hash, audio)
  return NextResponse.json({ audio, sampleRate: SAMPLE_RATE, cached: false })
})
