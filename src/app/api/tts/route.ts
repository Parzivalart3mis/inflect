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

// Azure voices per language (base code), most natural first — an ordered
// fallback chain (a busy/unavailable voice degrades to the next).
//
// `en` leads with a *Multilingual* voice on purpose: rules/grammar cards are
// English explanations with Spanish examples mixed into the same sentence
// (e.g. "posible ends in -ible", "querer→quiero"). A multilingual voice
// context-switches so the Spanish spans get Spanish pronunciation instead of
// being anglicised ("aible"), while English stays English. The Dragon HD /
// standard voices remain as fallbacks.
//
// `es`/vocab leads with the Dragon HD voice — the most natural single-language
// Spanish voice for standalone words.
const AZURE_VOICES: Record<string, string[]> = {
  en: [
    'en-US-AvaMultilingualNeural',
    'en-US-Ava:DragonHDLatestNeural',
    'en-US-AriaNeural',
  ],
  es: [
    'es-ES-Ximena:DragonHDLatestNeural',
    'es-ES-XimenaMultilingualNeural',
    'es-ES-ElviraNeural',
  ],
  // Japanese must map explicitly — otherwise it falls through to `en` and is
  // spoken by an English voice.
  ja: ['ja-JP-NanamiNeural', 'ja-JP-KeitaNeural'],
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
// if neither returns audio.
const azureConfigured =
  !!process.env.AZURE_SPEECH_KEY && !!process.env.AZURE_SPEECH_REGION

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
  const region = process.env.AZURE_SPEECH_REGION as string
  const key = process.env.AZURE_SPEECH_KEY as string
  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`

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

const geminiAvailable = () => !!process.env.GEMINI_API_KEY

// Rules/grammar cards are sent as English but contain target-language examples
// mixed into the same sentence ("posible ends in -ible", "querer→quiero"). A
// single Azure voice can't switch mid-sentence, but Gemini's TTS infers the
// language from context and pronounces each span correctly. So for English/
// mixed text we prefer Gemini (tapped rarely, its rate limit is fine) and fall
// back to Azure; vocab (a single target-language word) stays Azure-first, which
// is fast, cached, and never rate-limited.
function isMixedLang(lang?: string): boolean {
  return (lang ?? '').slice(0, 2).toLowerCase() === 'en'
}

/** The provider tried first for this text — also determines the cache key. */
function primaryProvider(lang?: string): 'azure' | 'gemini' {
  if (isMixedLang(lang)) return geminiAvailable() ? 'gemini' : 'azure'
  return azureConfigured ? 'azure' : 'gemini'
}

async function geminiSynthesize(text: string, lang?: string): Promise<string> {
  const model = process.env.GEMINI_TTS_MODEL ?? DEFAULT_GEMINI_MODEL
  const voiceName = process.env.GEMINI_TTS_VOICE ?? DEFAULT_GEMINI_VOICE
  const name = languageName(lang)
  const prompt = isMixedLang(lang)
    ? `Read this aloud naturally. It is mostly English but contains words and short examples from another language — pronounce each non-English word in its own language with a native accent, keeping the English in English: ${text}`
    : name
      ? `Pronounce this ${name} word or phrase naturally, like a native speaker: ${text}`
      : `Say this clearly and naturally: ${text}`
  return geminiGenerate(
    new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string }),
    model,
    voiceName,
    prompt,
  )
}

/** Try the preferred provider, then fall back. Throws if all providers fail. */
async function synthesize(rawText: string, lang?: string): Promise<string> {
  const text = speakableText(rawText)
  const order: Array<'azure' | 'gemini'> =
    primaryProvider(lang) === 'gemini'
      ? ['gemini', 'azure']
      : ['azure', 'gemini']

  let lastErr: unknown
  for (const p of order) {
    if (p === 'azure' && !azureConfigured) continue
    if (p === 'gemini' && !geminiAvailable()) continue
    try {
      return p === 'azure'
        ? await azureSynthesize(text, lang)
        : await geminiSynthesize(text, lang)
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('No TTS provider')
}

/** Cache key. Includes the primary provider + voice so Azure and Gemini
 * renderings of the same text never collide. */
function cacheHash(text: string, lang?: string): string {
  const providerId =
    primaryProvider(lang) === 'gemini'
      ? `gemini|${process.env.GEMINI_TTS_MODEL ?? DEFAULT_GEMINI_MODEL}|${process.env.GEMINI_TTS_VOICE ?? DEFAULT_GEMINI_VOICE}`
      : `azure|${azureVoicesFor(lang)[0]}`
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

  // Drives the client's pre-warm pacing (Gemini is slow/rate-limited, Azure fast).
  const provider = primaryProvider(lang)

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
