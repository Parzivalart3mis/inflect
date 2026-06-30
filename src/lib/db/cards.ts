import { and, desc, eq } from 'drizzle-orm'

import type { Bucket } from '@/lib/srs/sm2'
import type { BucketCounts, CardDTO, DeckDTO, DeckKind } from '@/types/dto'

import { sortCardsForDeck } from '@/lib/cards/sort'

import { db } from './index'
import { decks, flashcards, srsProgress } from './schema'

type CardRow = typeof flashcards.$inferSelect
type SrsRow = typeof srsProgress.$inferSelect

export function emptyBuckets(): BucketCounts {
  return { new: 0, learning: 0, review: 0, mastered: 0 }
}

/** End of the current server day — used for "due today" comparisons. */
export function endOfToday(now: Date = new Date()): Date {
  const d = new Date(now)
  d.setHours(23, 59, 59, 999)
  return d
}

export function toCardDTO(
  card: CardRow,
  srs: SrsRow | null,
  deckKind: DeckKind = 'grammar',
): CardDTO {
  return {
    id: card.id,
    deckId: card.deckId,
    deckKind,
    front: card.front,
    back: card.back,
    hasException: card.hasException ?? card.back != null,
    isPinned: card.isPinned,
    sourceNoteId: card.sourceNoteId,
    sourceSessionId: card.sourceSessionId,
    createdAt: card.createdAt.toISOString(),
    srs: srs
      ? {
          bucket: srs.bucket,
          dueDate: srs.dueDate.toISOString(),
          interval: srs.interval,
          repetitions: srs.repetitions,
          easeFactor: srs.easeFactor,
          lastRating: srs.lastRating,
          lastReviewedAt: srs.lastReviewedAt?.toISOString() ?? null,
        }
      : null,
  }
}

export async function getOwnedDeck(userId: string, deckId: string) {
  return db.query.decks.findFirst({
    where: and(eq(decks.id, deckId), eq(decks.userId, userId)),
  })
}

export async function getOwnedCard(userId: string, cardId: string) {
  return db.query.flashcards.findFirst({
    where: and(eq(flashcards.id, cardId), eq(flashcards.userId, userId)),
  })
}

/** Decks for a language with card counts, SRS bucket breakdown, and due-today. */
export async function listDecks(
  userId: string,
  languageId: string,
): Promise<DeckDTO[]> {
  const rows = await db
    .select({
      deck: decks,
      cardId: flashcards.id,
      isPinned: flashcards.isPinned,
      bucket: srsProgress.bucket,
      dueDate: srsProgress.dueDate,
    })
    .from(decks)
    .leftJoin(flashcards, eq(flashcards.deckId, decks.id))
    .leftJoin(srsProgress, eq(srsProgress.cardId, flashcards.id))
    .where(and(eq(decks.userId, userId), eq(decks.languageId, languageId)))
    .orderBy(desc(decks.createdAt))

  const cutoff = endOfToday()
  const map = new Map<string, DeckDTO>()

  for (const row of rows) {
    let dto = map.get(row.deck.id)
    if (!dto) {
      dto = {
        id: row.deck.id,
        languageId: row.deck.languageId,
        name: row.deck.name,
        description: row.deck.description,
        kind: row.deck.kind,
        cardCount: 0,
        dueToday: 0,
        buckets: emptyBuckets(),
        createdAt: row.deck.createdAt.toISOString(),
      }
      map.set(row.deck.id, dto)
    }
    if (!row.cardId) continue // deck with no cards
    dto.cardCount += 1
    const bucket = (row.bucket ?? 'new') as Bucket
    dto.buckets[bucket] += 1
    const due = !row.dueDate || row.dueDate <= cutoff
    if (due || row.isPinned) dto.dueToday += 1
  }

  return [...map.values()]
}

/** All cards in a deck with their SRS rows joined. */
export async function listDeckCards(
  userId: string,
  deckId: string,
): Promise<CardDTO[]> {
  const rows = await db
    .select({ card: flashcards, srs: srsProgress, kind: decks.kind })
    .from(flashcards)
    .innerJoin(decks, eq(flashcards.deckId, decks.id))
    .leftJoin(srsProgress, eq(srsProgress.cardId, flashcards.id))
    .where(and(eq(flashcards.deckId, deckId), eq(flashcards.userId, userId)))
    .orderBy(desc(flashcards.createdAt))

  const cards = rows.map((r) => toCardDTO(r.card, r.srs, r.kind))
  return sortCardsForDeck(cards, rows[0]?.kind ?? 'grammar')
}

/** Recompute and persist a deck's denormalized card_count. */
export async function recountDeck(deckId: string): Promise<number> {
  const cards = await db
    .select({ id: flashcards.id })
    .from(flashcards)
    .where(eq(flashcards.deckId, deckId))
  const n = cards.length
  await db.update(decks).set({ cardCount: n }).where(eq(decks.id, deckId))
  return n
}

export interface InsertCardInput {
  userId: string
  deckId: string
  front: string
  back?: string | null
  sourceNoteId?: string | null
  sourceSessionId?: string | null
}

/**
 * Insert a flashcard together with its initial SRS row (due immediately, in
 * the `new` bucket) and refresh the deck's card_count. The neon-http driver is
 * stateless (no transactions), so these run as sequential statements.
 */
export async function insertCard(input: InsertCardInput): Promise<CardDTO> {
  const [card] = await db
    .insert(flashcards)
    .values({
      userId: input.userId,
      deckId: input.deckId,
      front: input.front,
      back: input.back ?? null,
      sourceNoteId: input.sourceNoteId ?? null,
      sourceSessionId: input.sourceSessionId ?? null,
    })
    .returning()

  const [srs] = await db
    .insert(srsProgress)
    .values({
      cardId: card.id,
      userId: input.userId,
      interval: 1,
      repetitions: 0,
      easeFactor: 2.5,
      dueDate: new Date(),
      bucket: 'new',
    })
    .returning()

  await recountDeck(input.deckId)
  const [deck] = await db
    .select({ kind: decks.kind })
    .from(decks)
    .where(eq(decks.id, input.deckId))
  return toCardDTO(card, srs, deck?.kind ?? 'grammar')
}

/** Bulk insert cards (and their SRS rows) into a single deck. */
export async function insertCardsBulk(
  userId: string,
  deckId: string,
  cards: { front: string; back?: string | null }[],
): Promise<CardDTO[]> {
  if (cards.length === 0) return []

  const inserted = await db
    .insert(flashcards)
    .values(
      cards.map((c) => ({
        userId,
        deckId,
        front: c.front,
        back: c.back ?? null,
      })),
    )
    .returning()

  const srsRows = await db
    .insert(srsProgress)
    .values(
      inserted.map((card) => ({
        cardId: card.id,
        userId,
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        dueDate: new Date(),
        bucket: 'new' as const,
      })),
    )
    .returning()

  const srsByCard = new Map(srsRows.map((s) => [s.cardId, s]))
  await recountDeck(deckId)
  const [deck] = await db
    .select({ kind: decks.kind })
    .from(decks)
    .where(eq(decks.id, deckId))
  const kind = deck?.kind ?? 'grammar'
  return inserted.map((card) =>
    toCardDTO(card, srsByCard.get(card.id) ?? null, kind),
  )
}
