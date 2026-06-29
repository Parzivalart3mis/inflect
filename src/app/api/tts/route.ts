import { GoogleGenAI, Modality } from '@google/genai'
import { NextResponse } from 'next/server'

import { ApiError, parseBody, requireUser, route } from '@/lib/api'
import { enforceRateLimit } from '@/lib/rate-limit'
import { ttsSchema } from '@/lib/validations'

const DEFAULT_MODEL = 'gemini-2.5-flash-preview-tts'
const DEFAULT_VOICE = 'Kore'

function languageName(lang?: string): string | null {
  const part = (lang ?? '').slice(0, 2).toLowerCase()
  if (!part || part === 'en') return null
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(part) ?? null
  } catch {
    return null
  }
}

function parseSampleRate(mimeType?: string): number {
  const m = mimeType?.match(/rate=(\d+)/i)
  return m ? Number(m[1]) : 24000
}

export const POST = route(async (request: Request) => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // Client falls back to the on-device voice when TTS isn't configured.
    throw new ApiError('tts_unconfigured', 'AI voice is not configured', 503)
  }

  const userId = await requireUser()
  const { text, lang } = await parseBody(request, ttsSchema)
  await enforceRateLimit('tts', userId, 'Too many pronunciations this hour')

  const name = languageName(lang)
  const prompt = name
    ? `Pronounce this ${name} word or phrase naturally, like a native speaker: ${text}`
    : `Say this clearly and naturally: ${text}`

  const ai = new GoogleGenAI({ apiKey })
  const model = process.env.GEMINI_TTS_MODEL ?? DEFAULT_MODEL
  const voiceName = process.env.GEMINI_TTS_VOICE ?? DEFAULT_VOICE

  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
      },
    },
  })

  const inline = res.candidates?.[0]?.content?.parts?.[0]?.inlineData
  const audio = res.data ?? inline?.data
  if (!audio) {
    throw new ApiError('tts_error', 'No audio returned', 502)
  }

  return NextResponse.json({
    audio,
    sampleRate: parseSampleRate(inline?.mimeType),
  })
})
