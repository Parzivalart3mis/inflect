import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'

import { ApiError, route } from '@/lib/api'
import { getOwnedCard, getOwnedDeck } from '@/lib/db/cards'
import { getOrCreateUser } from '@/lib/db/user'
import { getOwnedLanguage } from '@/lib/db/workspace'
import { enforceRateLimit } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ cardId: string }> }

const MODEL = process.env.GEMINI_RECAP_MODEL ?? 'gemini-2.5-flash'
const MAX_EXAMPLES = 3
const MAX_CONJUGATIONS = 6

interface Example {
  target: string
  translation: string
}
interface Conjugation {
  label: string
  value: string
}

/** Generate example sentences (sentence mining) and verb conjugations for a card. */
export const POST = route(async (_request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  await enforceRateLimit('write', user.id)
  const { cardId } = await ctx.params

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new ApiError('ai_unconfigured', 'AI is not configured', 503)

  const card = await getOwnedCard(user.id, cardId)
  if (!card) throw new ApiError('not_found', 'Card not found', 404)

  const deck = await getOwnedDeck(user.id, card.deckId)
  if (!deck) throw new ApiError('not_found', 'Deck not found', 404)

  const language = await getOwnedLanguage(user.id, deck.languageId)
  if (!language) throw new ApiError('not_found', 'Language not found', 404)

  const prompt = `For this ${language.name} vocabulary flashcard, produce study material.
Card front (English meaning): "${card.front.slice(0, 500)}"
Card back (${language.name} word plus a pronunciation guide): "${(card.back ?? '').slice(0, 500)}"

Return ONLY JSON of the form {"word": string, "partOfSpeech": string, "examples": [{"target": string, "translation": string}], "conjugations": [{"label": string, "value": string}]}.
- "word": the ${language.name} word or phrase itself, with no pronunciation guide.
- "partOfSpeech": a short English label such as "verb", "noun", "adjective", "phrase".
- "examples": exactly ${MAX_EXAMPLES} natural, everyday sentences in ${language.name} that use the word in context, each with a faithful English "translation".
- "conjugations": ONLY if the word is a verb, up to ${MAX_CONJUGATIONS} of its most useful conjugated forms. "label" is the English tense/person (e.g. "I (present)"), "value" is the ${language.name} form. If the word is not a verb, return an empty array.`

  let parsed: {
    word?: string
    partOfSpeech?: string
    examples?: Example[]
    conjugations?: Conjugation[]
  }
  try {
    const ai = new GoogleGenAI({ apiKey })
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    })
    parsed = JSON.parse(res.text ?? '')
  } catch {
    throw new ApiError('ai_failed', 'Could not generate examples', 502)
  }

  const examples: Example[] = Array.isArray(parsed.examples)
    ? parsed.examples
        .filter(
          (e) => e && typeof e.target === 'string' && e.target.trim().length > 0,
        )
        .slice(0, MAX_EXAMPLES)
        .map((e) => ({
          target: e.target.trim().slice(0, 500),
          translation: (e.translation ?? '').trim().slice(0, 500),
        }))
    : []

  const conjugations: Conjugation[] = Array.isArray(parsed.conjugations)
    ? parsed.conjugations
        .filter(
          (c) =>
            c && typeof c.value === 'string' && c.value.trim().length > 0,
        )
        .slice(0, MAX_CONJUGATIONS)
        .map((c) => ({
          label: (c.label ?? '').trim().slice(0, 80),
          value: c.value.trim().slice(0, 120),
        }))
    : []

  return NextResponse.json({
    word:
      typeof parsed.word === 'string' && parsed.word.trim()
        ? parsed.word.trim().slice(0, 200)
        : card.front,
    partOfSpeech:
      typeof parsed.partOfSpeech === 'string'
        ? parsed.partOfSpeech.trim().slice(0, 40)
        : '',
    examples,
    conjugations,
  })
})
