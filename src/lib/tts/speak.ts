'use client'

/**
 * Web Speech API wrapper. Speaks `text` in the given BCP-47 locale, picking
 * the best matching installed voice when available. No-ops on the server or
 * in browsers without speechSynthesis.
 */
export function speak(text: string, localeCode: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  const trimmed = text.trim()
  if (!trimmed) return

  // Cancel anything currently speaking so taps feel responsive.
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(trimmed)
  utterance.lang = localeCode

  const voice = pickVoice(localeCode)
  if (voice) utterance.voice = voice

  window.speechSynthesis.speak(utterance)
}

export function isTTSAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickVoice(localeCode: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  // Exact locale (es-ES), then language family (es), else null.
  const lower = localeCode.toLowerCase()
  const lang = lower.split('-')[0]

  return (
    voices.find((v) => v.lang.toLowerCase() === lower) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang + '-')) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ??
    null
  )
}
