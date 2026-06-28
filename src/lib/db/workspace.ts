import { and, count, eq } from 'drizzle-orm'

import type { LanguageDTO } from '@/types/dto'

import { db } from './index'
import { decks, flashcards, languages } from './schema'

/** All languages for a user with deck + card counts (powers GET /api/languages). */
export async function listLanguages(userId: string): Promise<LanguageDTO[]> {
  const [langs, deckCounts, cardCounts] = await Promise.all([
    db
      .select()
      .from(languages)
      .where(eq(languages.userId, userId))
      .orderBy(languages.createdAt),
    db
      .select({ languageId: decks.languageId, value: count() })
      .from(decks)
      .where(eq(decks.userId, userId))
      .groupBy(decks.languageId),
    db
      .select({ languageId: decks.languageId, value: count() })
      .from(flashcards)
      .innerJoin(decks, eq(flashcards.deckId, decks.id))
      .where(eq(flashcards.userId, userId))
      .groupBy(decks.languageId),
  ])

  const deckMap = new Map(deckCounts.map((d) => [d.languageId, d.value]))
  const cardMap = new Map(cardCounts.map((c) => [c.languageId, c.value]))

  return langs.map((l) => ({
    id: l.id,
    name: l.name,
    localeCode: l.localeCode,
    flagEmoji: l.flagEmoji,
    deckCount: deckMap.get(l.id) ?? 0,
    cardCount: cardMap.get(l.id) ?? 0,
  }))
}

/** Verify a language belongs to the user; returns it or null. */
export async function getOwnedLanguage(userId: string, languageId: string) {
  return db.query.languages.findFirst({
    where: and(eq(languages.id, languageId), eq(languages.userId, userId)),
  })
}
