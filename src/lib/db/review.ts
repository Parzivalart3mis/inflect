import { and, asc, eq, isNull, lte, or } from 'drizzle-orm'

import type { CardDTO, DeckKind } from '@/types/dto'

import { endOfToday, toCardDTO } from './cards'
import { db } from './index'
import { decks, flashcards, srsProgress } from './schema'

const MAX_QUEUE = 200

/**
 * Cards for a review/practice session, ordered by due_date ascending.
 *
 * Default: everything due today for the language (optionally one deck); pinned
 * and new cards (no SRS row) are always included.
 *
 * `pinnedOnly` (optionally scoped by `kind`) builds a "practice difficult"
 * queue — just the pinned-as-difficult cards, regardless of due date. It does
 * not create a deck; it's an ephemeral queue.
 */
export async function getReviewQueue(params: {
  userId: string
  languageId: string
  deckId?: string
  pinnedOnly?: boolean
  kind?: DeckKind
}): Promise<CardDTO[]> {
  const { userId, languageId, deckId, pinnedOnly, kind } = params
  const cutoff = endOfToday()

  const selector = pinnedOnly
    ? eq(flashcards.isPinned, true)
    : or(
        lte(srsProgress.dueDate, cutoff),
        eq(flashcards.isPinned, true),
        isNull(srsProgress.id),
      )

  const rows = await db
    .select({ card: flashcards, srs: srsProgress, kind: decks.kind })
    .from(flashcards)
    .innerJoin(decks, eq(flashcards.deckId, decks.id))
    .leftJoin(srsProgress, eq(srsProgress.cardId, flashcards.id))
    .where(
      and(
        eq(flashcards.userId, userId),
        eq(decks.languageId, languageId),
        deckId ? eq(flashcards.deckId, deckId) : undefined,
        kind ? eq(decks.kind, kind) : undefined,
        selector,
      ),
    )
    .orderBy(asc(srsProgress.dueDate))
    .limit(MAX_QUEUE)

  return rows.map((r) => toCardDTO(r.card, r.srs, r.kind))
}
