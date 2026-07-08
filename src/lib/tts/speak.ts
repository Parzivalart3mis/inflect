'use client'

/**
 * Pronunciation playback. Primary path is AI TTS (Gemini, via /api/tts) for a
 * natural voice; falls back to the on-device Web Speech voice if the AI path is
 * unavailable (no key / error / offline). Decoded audio is cached per
 * text+locale so repeat taps are instant and don't re-bill.
 */

let audioCtx: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null
let inflight: AbortController | null = null
const cache = new Map<string, AudioBuffer>()
const MAX_CACHE = 80

function getCtx(): AudioContext {
  // A context that iOS closed after an interruption can't be revived — make a
  // fresh one. Buffers are bound to a context, so drop the decoded cache too.
  if (!audioCtx || audioCtx.state === 'closed') {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    audioCtx = new Ctx()
    cache.clear()
  }
  return audioCtx
}

/**
 * Ensure a usable, running context. iOS puts the context into `suspended` or
 * `interrupted` when the phone locks/backgrounds; on return we must resume it,
 * and if that fails (or it was closed) recreate it. Returns a running context.
 */
async function getRunningCtx(): Promise<AudioContext> {
  let ctx = getCtx()
  if (ctx.state !== 'running') {
    try {
      await ctx.resume()
    } catch {
      // fall through to recreate
    }
  }
  if (ctx.state !== 'running') {
    try {
      await ctx.close()
    } catch {
      // ignore
    }
    audioCtx = null
    cache.clear()
    ctx = getCtx()
    try {
      await ctx.resume()
    } catch {
      // best effort; start() below will reveal if it's truly unusable
    }
  }
  return ctx
}

// Proactively resume when the app comes back to the foreground so the first tap
// after unlocking works without a dropped play.
if (typeof window !== 'undefined') {
  const wake = () => {
    if (audioCtx && audioCtx.state !== 'running' && audioCtx.state !== 'closed') {
      audioCtx.resume().catch(() => {})
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') wake()
  })
  window.addEventListener('pageshow', wake)
}

function stopCurrent() {
  if (currentSource) {
    try {
      currentSource.stop()
    } catch {
      // already stopped
    }
    currentSource = null
  }
}

function base64ToInt16(base64: string): Int16Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Int16Array(bytes.buffer)
}

function decodePcm(
  ctx: AudioContext,
  base64: string,
  sampleRate: number,
): AudioBuffer {
  const int16 = base64ToInt16(base64)
  const float = new Float32Array(int16.length)
  for (let i = 0; i < int16.length; i++) float[i] = int16[i] / 32768
  const buffer = ctx.createBuffer(1, float.length, sampleRate)
  buffer.copyToChannel(float, 0)
  return buffer
}

/** Returns false when the AI path is unavailable so the caller can fall back. */
async function playAI(
  text: string,
  localeCode: string,
  signal: AbortSignal,
): Promise<boolean> {
  // Unlock/resume (or recreate) the context within the user gesture. Handles
  // the iOS lock/return case where the context is suspended/interrupted/closed.
  const ctx = await getRunningCtx()

  const key = `${localeCode}|${text}`
  let buffer = cache.get(key)

  if (!buffer) {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, lang: localeCode }),
      signal,
    })
    if (!res.ok) return false
    const { audio, sampleRate } = (await res.json()) as {
      audio: string
      sampleRate: number
    }
    if (!audio) return false
    buffer = decodePcm(ctx, audio, sampleRate || 24000)
    cache.set(key, buffer)
    if (cache.size > MAX_CACHE) {
      const oldest = cache.keys().next().value
      if (oldest) cache.delete(oldest)
    }
  }

  stopCurrent()
  try {
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.onended = () => {
      if (currentSource === source) currentSource = null
    }
    source.start()
    currentSource = source
  } catch {
    // Context died mid-play (e.g. iOS interruption) — let the caller fall back.
    return false
  }
  return true
}

function playSystem(text: string, localeCode: string) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = localeCode
  const voice = pickVoice(localeCode)
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
}

/**
 * Speak `text` in `localeCode`. Resolves once playback has started (or the
 * fallback has been dispatched) — callers can await it to show a loading state.
 */
export async function speak(text: string, localeCode: string): Promise<void> {
  if (typeof window === 'undefined') return
  const trimmed = text.trim()
  if (!trimmed) return

  // Cancel any in-flight system speech + supersede a pending AI request.
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  inflight?.abort()
  const controller = new AbortController()
  inflight = controller

  try {
    const ok = await playAI(trimmed, localeCode, controller.signal)
    if (ok) return
  } catch (err) {
    // A newer tap aborted this one — let it handle playback, don't fall back.
    if (err instanceof DOMException && err.name === 'AbortError') return
    // otherwise fall through to the system voice
  } finally {
    if (inflight === controller) inflight = null
  }
  playSystem(trimmed, localeCode)
}

export function isTTSAvailable(): boolean {
  return typeof window !== 'undefined'
}

/**
 * Unlock/resume the audio context from within a user gesture. Call this on a
 * tap that begins hands-free playback (auto-play practice), so later
 * timer-triggered `speak()` calls — which don't run inside a gesture — still
 * produce sound on iOS.
 */
export async function unlockAudio(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    await getRunningCtx()
  } catch {
    // best effort
  }
}

const ENGLISH_LOCALE = 'en-US'

/**
 * Single source of truth for what to speak and in which language for a card
 * face — used by every call site (flashcard, deck tile, review) so voice/locale
 * selection is never duplicated or divergent. The server (azureVoicesFor) then
 * maps the locale to the actual voice.
 *
 * - Vocab: the target-language word (phonetic guide stripped) in the deck locale
 *   (es-ES → Spanish voice, ja-JP → Japanese voice).
 * - Grammar/rules: the English explanation (which may contain Spanish examples)
 *   in English — the server uses a multilingual voice so embedded Spanish spans
 *   are pronounced in Spanish.
 *
 * Returns null when there's nothing to speak.
 */
export function resolveUtterance(
  face: 'front' | 'back',
  card: {
    front: string
    back: string | null
    isVocab: boolean
    localeCode: string
  },
): { text: string; locale: string } | null {
  const raw = face === 'front' ? card.front : (card.back ?? '')
  if (!raw.trim()) return null
  return card.isVocab
    ? { text: stripPhonetic(raw), locale: card.localeCode }
    : { text: raw, locale: ENGLISH_LOCALE }
}

// ---- Deck pre-warm: generate + cache a whole deck's audio, paced under the
// per-minute rate limit, so later playback is always served from cache. ----
// Spacing after each fresh generation, by provider. Azure's free tier is far
// more generous than Gemini's ~10/min preview cap, so it can be paced tightly.
const PREWARM_INTERVAL_MS: Record<string, number> = {
  azure: 400,
  gemini: 9000,
}
const DEFAULT_PREWARM_INTERVAL_MS = 9000
const PREWARM_BACKOFF_MS = 60_000 // wait out a rate-limit window, then retry

export interface PrewarmJob {
  text: string
  lang: string
}

function sleepAbortable(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('aborted', 'AbortError'))
    const t = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(t)
        reject(new DOMException('aborted', 'AbortError'))
      },
      { once: true },
    )
  })
}

/**
 * Sequentially ensures each job's audio is cached. Cache hits are instant;
 * fresh generations are spaced out (and rate-limit errors are backed off and
 * retried) so the deck can be prepared without tripping the RPM cap.
 * Throws AbortError if the signal is aborted.
 */
export async function prewarmTTS(
  jobs: PrewarmJob[],
  opts: { signal: AbortSignal; onProgress?: (processed: number, total: number) => void },
): Promise<{ done: number; failed: number }> {
  const seen = new Set<string>()
  const uniq = jobs.filter((j) => {
    const trimmed = j.text.trim()
    if (!trimmed) return false
    const k = `${j.lang}|${trimmed}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  let done = 0
  let failed = 0

  for (const job of uniq) {
    if (opts.signal.aborted) throw new DOMException('aborted', 'AbortError')
    let ok = false
    // A few backoff-and-retry attempts: rules cards go through Gemini (which
    // reads mixed English/Spanish correctly but rate-limits often), so extra
    // retries let more of them eventually land a render and get cached.
    for (let attempt = 0; attempt < 4 && !ok; attempt++) {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: job.text.trim(), lang: job.lang, warm: true }),
        signal: opts.signal,
      })
      if (res.ok) {
        const data = (await res.json()) as {
          cached?: boolean
          provider?: string
        }
        ok = true
        if (!data.cached) {
          const wait =
            PREWARM_INTERVAL_MS[data.provider ?? ''] ??
            DEFAULT_PREWARM_INTERVAL_MS
          await sleepAbortable(wait, opts.signal)
        }
      } else if (res.status === 429 || res.status >= 500) {
        // Rate-limited or transient — wait out the window, then retry.
        await sleepAbortable(PREWARM_BACKOFF_MS, opts.signal)
      } else {
        break // 4xx (e.g. unconfigured) — don't retry
      }
    }
    if (ok) done++
    else failed++
    opts.onProgress?.(done + failed, uniq.length)
  }

  return { done, failed }
}

/**
 * Strips parenthetical phonetic guides and newlines so a vocab back like
 * `"quiero\n(KYEH-roh)"` is spoken as just `"quiero"`.
 */
export function stripPhonetic(text: string): string {
  return text
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickVoice(localeCode: string): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const lower = localeCode.toLowerCase()
  const lang = lower.split('-')[0]
  return (
    voices.find((v) => v.lang.toLowerCase() === lower) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang + '-')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ??
    null
  )
}
