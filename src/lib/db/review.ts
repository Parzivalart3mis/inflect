import { and, asc, eq, isNull, lte, or } from 'drizzle-orm'

import type { CardDTO } from '@/types/dto'

import { endOfToday, toCardDTO } from './cards'
import { db } from './index'
import { decks, flashcards, srsProgress } from './schema'

const MAX_QUEUE = 200

/**
 * Cards due today for a language (optionally a single deck), ordered by
 * due_date ascending. Pinned cards are always included. New cards (no SRS row
 * yet) count as due.
 */
export async function getReviewQueue(params: {
  userId: string
  languageId: string
  deckId?: string
}): Promise<CardDTO[]> {
  const { userId, languageId, deckId } = params
  const cutoff = endOfToday()

  const rows = await db
    .select({ card: flashcards, srs: srsProgress })
    .from(flashcards)
    .innerJoin(decks, eq(flashcards.deckId, decks.id))
    .leftJoin(srsProgress, eq(srsProgress.cardId, flashcards.id))
    .where(
      and(
        eq(flashcards.userId, userId),
        eq(decks.languageId, languageId),
        deckId ? eq(flashcards.deckId, deckId) : undefined,
        or(
          lte(srsProgress.dueDate, cutoff),
          eq(flashcards.isPinned, true),
          isNull(srsProgress.id),
        ),
      ),
    )
    .orderBy(asc(srsProgress.dueDate))
    .limit(MAX_QUEUE)

  return rows.map((r) => toCardDTO(r.card, r.srs))
}
