import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'

import { ApiError, route } from '@/lib/api'
import { getOwnedNote } from '@/lib/db/notes'
import { getOrCreateUser } from '@/lib/db/user'
import { getOwnedLanguage } from '@/lib/db/workspace'
import { enforceRateLimit } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ noteId: string }> }

const MODEL = process.env.GEMINI_RECAP_MODEL ?? 'gemini-2.5-flash'
const MAX_CARDS = 15

interface SuggestedCard {
  front: string
  back: string
}

/** Draft vocabulary flashcards from a note's content using Gemini. */
export const POST = route(async (_request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  await enforceRateLimit('write', user.id)
  const { noteId } = await ctx.params

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new ApiError('ai_unconfigured', 'AI is not configured', 503)

  const note = await getOwnedNote(user.id, noteId)
  if (!note) throw new ApiError('not_found', 'Note not found', 404)

  const language = await getOwnedLanguage(user.id, note.languageId)
  if (!language) throw new ApiError('not_found', 'Language not found', 404)

  const content = note.content.trim().slice(0, 12_000)
  if (content.length < 20) {
    return NextResponse.json({ cards: [] })
  }

  const prompt = `From this ${language.name} study note, extract up to ${MAX_CARDS} vocabulary flashcards.
Return ONLY JSON of the form {"cards": [{"front": string, "back": string}]}.
- "front": the English meaning or prompt.
- "back": the ${language.name} word or phrase, followed by a short pronunciation guide in parentheses.
Only include genuine ${language.name} vocabulary or useful phrases from the note — skip meta-commentary, headings, and English-only lines. If there is nothing worth turning into a card, return an empty list.

Note:
${content}`

  let parsed: { cards?: SuggestedCard[] }
  try {
    const ai = new GoogleGenAI({ apiKey })
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    })
    parsed = JSON.parse(res.text ?? '')
  } catch {
    throw new ApiError('ai_failed', 'Could not suggest cards', 502)
  }

  const cards: SuggestedCard[] = Array.isArray(parsed.cards)
    ? parsed.cards
        .filter((c) => c && typeof c.front === 'string' && c.front.trim())
        .slice(0, MAX_CARDS)
        .map((c) => ({
          front: c.front.trim().slice(0, 1000),
          back: (c.back ?? '').trim().slice(0, 1000),
        }))
    : []

  return NextResponse.json({ cards })
})
