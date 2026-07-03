import { createHash } from 'node:crypto'

import { GoogleGenAI, Modality } from '@google/genai'
import { list, put } from '@vercel/blob'
import { NextResponse } from 'next/server'

import { ApiError, parseBody, requireUser, route } from '@/lib/api'
import { enforceRateLimit } from '@/lib/rate-limit'
import { ttsSchema } from '@/lib/validations'

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash-preview-tts'
const DEFAULT_GEMINI_VOICE = 'Kore'
const SAMPLE_RATE = 24000
const RETRIES = 3

// Azure voices per language (base code), most natural first. Grammar cards are
// spoken in English; vocab words in the deck's target language. Each list is an
// ordered fallback chain: the newest "Dragon HD" voice first (closest to a
// human / Gemini), then a Multilingual voice, then a standard neural voice.
const AZURE_VOICES: Record<string, string[]> = {
  en: [
    'en-US-Ava:DragonHDLatestNeural',
    'en-US-AvaMultilingualNeural',
    'en-US-AriaNeural',
  ],
  es: [
    'es-ES-Ximena:DragonHDLatestNeural',
    'es-ES-XimenaMultilingualNeural',
    'es-ES-ElviraNeural',
  ],
  fr: ['fr-FR-DeniseNeural'],
  de: ['de-DE-KatjaNeural'],
  it: ['it-IT-ElsaNeural'],
  pt: ['pt-BR-FranciscaNeural'],
}

/**
 * Ordered voice fallback chain for the requested language. AZURE_SPEECH_VOICE
 * overrides only its own language (taking priority), so a custom Spanish voice
 * still leaves English (grammar) text on an English voice.
 */
function azureVoicesFor(lang?: string): string[] {
  const base = (lang ?? 'es').slice(0, 2).toLowerCase()
  const list = AZURE_VOICES[base] ?? AZURE_VOICES.en
  const override = process.env.AZURE_SPEECH_VOICE
  if (override && override.slice(0, 2).toLowerCase() === base) {
    return [override, ...list.filter((v) => v !== override)]
  }
  return list
}

// Provider selection. Azure Speech is preferred when configured (high RPM,
// native voices); Gemini is the fallback; the client uses the on-device voice
// if neither returns audio. Only the key is required — the region defaults to
// the resource's region, so setting just AZURE_SPEECH_KEY is enough (a missing
// region must not silently disable Azure and fall back to the browser voice).
const AZURE_DEFAULT_REGION = 'eastus'
const azureConfigured = !!process.env.AZURE_SPEECH_KEY
const azureRegion = process.env.AZURE_SPEECH_REGION || AZURE_DEFAULT_REGION

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

// Expand abbreviations and symbols that a neural TTS reads literally, so
// grammar cards ("e.g. vender→vende", "add -N") are spoken naturally the way
// Gemini's model did implicitly. Applied to every provider for consistency.
function speakableText(text: string): string {
  return text
    .replace(/[→⇒]|-{1,2}>/g, ' becomes ')
    .replace(/\be\.g\.,?/gi, 'for example,')
    .replace(/\bi\.e\.,?/gi, 'that is,')
    .replace(/\betc\./gi, 'etcetera')
    .replace(/\bvs\.?(?=\s|$)/gi, 'versus')
    // Drop a suffix hyphen so "-N" / "-AR" reads "N" / "AR", not "minus N".
    .replace(/(^|\s)[-–—]([A-Za-zÁÉÍÓÚÑáéíóúñ])/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
}

// ---- Azure Speech (primary) ----
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Synthesize with Azure, returning base64 24kHz 16-bit mono PCM. Walks the
 * voice fallback chain so a busy/unavailable HD voice degrades to the next. */
async function azureSynthesize(text: string, lang?: string): Promise<string> {
  const key = process.env.AZURE_SPEECH_KEY as string
  const endpoint = `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`

  let lastErr: unknown
  for (const voice of azureVoicesFor(lang)) {
    // Derive the SSML locale from the voice (es-ES-Ximena:DragonHD… → es-ES).
    const locale = voice.split('-').slice(0, 2).join('-') || 'es-ES'
    const ssml = `<speak version="1.0" xml:lang="${locale}"><voice name="${voice}">${escapeXml(text)}</voice></speak>`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'raw-24khz-16bit-mono-pcm',
        'User-Agent': 'inflect',
      },
      body: ssml,
    })
    if (res.ok) return Buffer.from(await res.arrayBuffer()).toString('base64')
    lastErr = new Error(`Azure TTS ${res.status} (${voice})`)
  }
  throw lastErr instanceof Error ? lastErr : new Error('Azure TTS failed')
}

// ---- Gemini (fallback) ----
async function geminiGenerate(
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
      // Never retry a quota/rate-limit error — retrying immediately only burns
      // more of the per-minute budget and deepens the 429 spiral.
      if ((err as { status?: number })?.status === 429) break
    }
    if (attempt < RETRIES - 1) await sleep(250 * (attempt + 1))
  }
  throw lastErr instanceof Error ? lastErr : new Error('TTS failed')
}

/** Try the preferred provider, then fall back. Throws if all providers fail. */
async function synthesize(rawText: string, lang?: string): Promise<string> {
  const text = speakableText(rawText)
  let lastErr: unknown
  if (azureConfigured) {
    try {
      return await azureSynthesize(text, lang)
    } catch (err) {
      lastErr = err
    }
  }
  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    const model = process.env.GEMINI_TTS_MODEL ?? DEFAULT_GEMINI_MODEL
    const voiceName = process.env.GEMINI_TTS_VOICE ?? DEFAULT_GEMINI_VOICE
    const name = languageName(lang)
    const prompt = name
      ? `Pronounce this ${name} word or phrase naturally, like a native speaker: ${text}`
      : `Say this clearly and naturally: ${text}`
    try {
      return await geminiGenerate(
        new GoogleGenAI({ apiKey: geminiKey }),
        model,
        voiceName,
        prompt,
      )
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('No TTS provider')
}

/** Cache key. Includes the provider + voice so Azure and Gemini renderings of
 * the same text never collide. */
function cacheHash(text: string, lang?: string): string {
  const providerId = azureConfigured
    ? `azure|${azureVoicesFor(lang)[0]}`
    : `gemini|${process.env.GEMINI_TTS_MODEL ?? DEFAULT_GEMINI_MODEL}|${process.env.GEMINI_TTS_VOICE ?? DEFAULT_GEMINI_VOICE}`
  return createHash('sha256')
    .update(`${providerId}|${lang ?? ''}|${text}`)
    .digest('hex')
}

export const POST = route(async (request: Request) => {
  if (!azureConfigured && !process.env.GEMINI_API_KEY) {
    // Client falls back to the on-device voice when TTS isn't configured.
    throw new ApiError('tts_unconfigured', 'AI voice is not configured', 503)
  }

  const userId = await requireUser()
  const { text, lang, warm } = await parseBody(request, ttsSchema)
  const hash = cacheHash(text, lang)

  const provider = azureConfigured ? 'azure' : 'gemini'

  // Pre-warm mode: only ensure the audio is cached; skip the audio payload.
  if (warm) {
    if (await blobExists(hash)) {
      return NextResponse.json({ cached: true, provider })
    }
    // Only charge the rate limiter when we actually call a provider.
    await enforceRateLimit('tts', userId, 'Too many pronunciations this hour')
    let audio: string
    try {
      audio = await synthesize(text, lang)
    } catch {
      throw new ApiError('tts_error', 'Could not synthesize audio', 502)
    }
    await writeCache(hash, audio)
    return NextResponse.json({ cached: false, provider })
  }

  // Playback: serve from the durable Blob cache first — a cache hit costs no
  // rate-limit token, so replaying prepared audio never trips the limiter.
  const cached = await readCache(hash)
  if (cached) {
    return NextResponse.json({
      audio: cached,
      sampleRate: SAMPLE_RATE,
      cached: true,
    })
  }

  await enforceRateLimit('tts', userId, 'Too many pronunciations this hour')
  let audio: string
  try {
    audio = await synthesize(text, lang)
  } catch {
    throw new ApiError('tts_error', 'Could not synthesize audio', 502)
  }

  void writeCache(hash, audio)
  return NextResponse.json({ audio, sampleRate: SAMPLE_RATE, cached: false })
})

// Diagnostic: open /api/tts (signed in) to see which providers THIS deployment
// actually sees, so a stale build or bad credential is obvious. Add ?probe=1
// to do a live Spanish Azure synth and report the HTTP result. No secret values
// are ever returned.
export const GET = route(async (request: Request) => {
  await requireUser()
  const { searchParams } = new URL(request.url)

  const status: Record<string, unknown> = {
    azure: azureConfigured,
    azureRegion: azureConfigured ? azureRegion : null,
    gemini: !!process.env.GEMINI_API_KEY,
    blobCache: hasBlob,
  }

  if (searchParams.get('probe') === '1' && azureConfigured) {
    try {
      const audio = await azureSynthesize('posible', 'es-ES')
      status.probe = {
        ok: true,
        voice: azureVoicesFor('es-ES')[0],
        bytes: Buffer.from(audio, 'base64').length,
      }
    } catch (err) {
      status.probe = { ok: false, error: (err as Error).message }
    }
  }

  return NextResponse.json(status)
})
