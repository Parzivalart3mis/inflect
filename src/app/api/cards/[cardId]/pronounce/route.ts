import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'

import { ApiError, route } from '@/lib/api'
import { getOwnedCard, getOwnedDeck } from '@/lib/db/cards'
import { getOrCreateUser } from '@/lib/db/user'
import { getOwnedLanguage } from '@/lib/db/workspace'
import { enforceRateLimit } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ cardId: string }> }

const MODEL = process.env.GEMINI_RECAP_MODEL ?? 'gemini-2.5-flash'
// ~2.6 MB of audio as base64 — a single spoken word is far smaller.
const MAX_AUDIO_CHARS = 3_500_000

/** Score a learner's spoken pronunciation of a card's word using Gemini audio. */
export const POST = route(async (request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  await enforceRateLimit('write', user.id)
  const { cardId } = await ctx.params

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new ApiError('ai_unconfigured', 'AI is not configured', 503)

  let body: { audio?: unknown; mimeType?: unknown; word?: unknown }
  try {
    body = await request.json()
  } catch {
    throw new ApiError('bad_request', 'Invalid body', 400)
  }

  const audio = typeof body.audio === 'string' ? body.audio : ''
  const rawMime = typeof body.mimeType === 'string' ? body.mimeType : ''
  const word =
    typeof body.word === 'string' ? body.word.trim().slice(0, 200) : ''

  if (!audio || audio.length > MAX_AUDIO_CHARS) {
    throw new ApiError('bad_request', 'Missing or oversized audio', 400)
  }
  // Normalize e.g. "audio/webm;codecs=opus" -> "audio/webm" for the inline part.
  const mimeType = rawMime.split(';')[0].trim()
  if (!mimeType.startsWith('audio/')) {
    throw new ApiError('bad_request', 'Unsupported audio type', 400)
  }

  const card = await getOwnedCard(user.id, cardId)
  if (!card) throw new ApiError('not_found', 'Card not found', 404)

  const deck = await getOwnedDeck(user.id, card.deckId)
  if (!deck) throw new ApiError('not_found', 'Deck not found', 404)

  const language = await getOwnedLanguage(user.id, deck.languageId)
  if (!language) throw new ApiError('not_found', 'Language not found', 404)

  const target = word || card.front

  const prompt = `A learner is practicing pronunciation of a ${language.name} word.
Target word: "${target}" (English meaning: "${card.front.slice(0, 300)}").
The attached audio is the learner attempting to say this word.
Return ONLY JSON of the form {"score": number, "heard": string, "tip": string}.
- "score": an integer 0-100 for how close their pronunciation is to a correct native ${language.name} pronunciation of "${target}".
- "heard": your best transcription of what the learner actually said.
- "tip": one short, specific, encouraging tip (max one sentence) to improve.
If the audio is silent, empty, or not an attempt at the word, set "score" to 0 and explain briefly in "tip".`

  let parsed: { score?: unknown; heard?: unknown; tip?: unknown }
  try {
    const ai = new GoogleGenAI({ apiKey })
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType, data: audio } },
            { text: prompt },
          ],
        },
      ],
      config: { responseMimeType: 'application/json' },
    })
    parsed = JSON.parse(res.text ?? '')
  } catch {
    throw new ApiError('ai_failed', 'Could not score pronunciation', 502)
  }

  const rawScore = Number(parsed.score)
  const score = Number.isFinite(rawScore)
    ? Math.max(0, Math.min(100, Math.round(rawScore)))
    : 0

  return NextResponse.json({
    score,
    heard:
      typeof parsed.heard === 'string' ? parsed.heard.trim().slice(0, 300) : '',
    tip: typeof parsed.tip === 'string' ? parsed.tip.trim().slice(0, 400) : '',
    word: target,
  })
})
