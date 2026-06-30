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
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    audioCtx = new Ctx()
  }
  return audioCtx
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
  const ctx = getCtx()
  // Unlock the context within the user gesture that triggered playback.
  if (ctx.state === 'suspended') await ctx.resume()

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
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.connect(ctx.destination)
  source.onended = () => {
    if (currentSource === source) currentSource = null
  }
  source.start()
  currentSource = source
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
