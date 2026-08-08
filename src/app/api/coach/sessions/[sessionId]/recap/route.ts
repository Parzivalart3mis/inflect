import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'

import { ApiError, route } from '@/lib/api'
import { getOwnedSession } from '@/lib/db/coach'
import { getOrCreateUser } from '@/lib/db/user'
import { getOwnedLanguage } from '@/lib/db/workspace'
import { enforceRateLimit } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ sessionId: string }> }

const RECAP_MODEL = process.env.GEMINI_RECAP_MODEL ?? 'gemini-2.5-flash'
const MAX_CARDS = 8

interface RecapCard {
  front: string
  back: string
}

/**
 * AI recap of a finished coach session: a short "what to work on" summary plus
 * suggested flashcards (vocab/phrases the learner struggled with or newly used).
 */
export const POST = route(async (_request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  await enforceRateLimit('write', user.id)
  const { sessionId } = await ctx.params

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new ApiError('recap_unconfigured', 'AI is not configured', 503)
  }

  const session = await getOwnedSession(user.id, sessionId)
  if (!session) throw new ApiError('not_found', 'Session not found', 404)

  const language = await getOwnedLanguage(user.id, session.languageId)
  if (!language) throw new ApiError('not_found', 'Language not found', 404)

  const transcript = (session.transcript ?? []).filter((t) => t.text.trim())
  if (transcript.length === 0) {
    return NextResponse.json({ summary: '', cards: [] })
  }

  const convo = transcript
    .map((t) => `${t.role === 'coach' ? 'Coach' : 'Learner'}: ${t.text}`)
    .join('\n')
    .slice(0, 12_000)

  const prompt = `You are a ${language.name} tutor reviewing a spoken practice session.
Return ONLY JSON of the form {"summary": string, "cards": [{"front": string, "back": string}]}.

1. "summary": 2-3 encouraging sentences on what the learner should work on next.
2. "cards": up to ${MAX_CARDS} flashcards for vocabulary or phrases the learner struggled with, got corrected on, or newly encountered. For each card: "front" is the English meaning/prompt; "back" is the ${language.name} word or phrase followed by a short pronunciation guide in parentheses. Skip cards if the conversation is too short to warrant any.

Conversation:
${convo}`

  let parsed: { summary?: string; cards?: RecapCard[] }
  try {
    const ai = new GoogleGenAI({ apiKey })
    const res = await ai.models.generateContent({
      model: RECAP_MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    })
    const text = res.text ?? ''
    parsed = JSON.parse(text)
  } catch {
    throw new ApiError('recap_failed', 'Could not generate a recap', 502)
  }

  const cards: RecapCard[] = Array.isArray(parsed.cards)
    ? parsed.cards
        .filter((c) => c && typeof c.front === 'string' && c.front.trim())
        .slice(0, MAX_CARDS)
        .map((c) => ({
          front: c.front.trim().slice(0, 1000),
          back: (c.back ?? '').trim().slice(0, 1000),
        }))
    : []

  return NextResponse.json({
    summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
    cards,
  })
})
