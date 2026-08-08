import { and, asc, eq } from 'drizzle-orm'

import type { SharedDeckDTO } from '@/types/dto'

import { insertCardsBulk } from './cards'
import { db } from './index'
import { decks, flashcards, languages } from './schema'

/** 24 hex chars from the Web Crypto RNG — URL-safe and hard to guess. */
export function makeShareToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Enable sharing for an owned deck, returning its (possibly pre-existing)
 * share token. Idempotent — re-sharing keeps the same link.
 */
export async function shareDeck(
  userId: string,
  deckId: string,
): Promise<string | null> {
  const deck = await db.query.decks.findFirst({
    where: and(eq(decks.id, deckId), eq(decks.userId, userId)),
  })
  if (!deck) return null
  if (deck.shareToken) return deck.shareToken

  const token = makeShareToken()
  await db
    .update(decks)
    .set({ shareToken: token })
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
  return token
}

/** Revoke a deck's share link. Existing links stop resolving. */
export async function unshareDeck(
  userId: string,
  deckId: string,
): Promise<boolean> {
  const deck = await db.query.decks.findFirst({
    where: and(eq(decks.id, deckId), eq(decks.userId, userId)),
  })
  if (!deck) return false
  await db
    .update(decks)
    .set({ shareToken: null })
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
  return true
}

/** Public read of a shared deck by token — cards are front/back only, no SRS. */
export async function getSharedDeck(
  token: string,
): Promise<SharedDeckDTO | null> {
  const deck = await db.query.decks.findFirst({
    where: eq(decks.shareToken, token),
  })
  if (!deck) return null

  const [language, cards] = await Promise.all([
    db.query.languages.findFirst({ where: eq(languages.id, deck.languageId) }),
    db
      .select({ front: flashcards.front, back: flashcards.back })
      .from(flashcards)
      .where(eq(flashcards.deckId, deck.id))
      .orderBy(asc(flashcards.createdAt)),
  ])

  return {
    name: deck.name,
    description: deck.description,
    cardCount: cards.length,
    languageName: language?.name ?? '',
    languageFlag: language?.flagEmoji ?? '',
    cards,
  }
}

/**
 * Copy a shared deck into a user's own language workspace: a fresh deck plus
 * copies of every card (new SRS state). Returns the new deck id, or null if the
 * token no longer resolves.
 */
export async function importSharedDeck(
  userId: string,
  token: string,
  languageId: string,
): Promise<string | null> {
  const source = await db.query.decks.findFirst({
    where: eq(decks.shareToken, token),
  })
  if (!source) return null

  const cards = await db
    .select({ front: flashcards.front, back: flashcards.back })
    .from(flashcards)
    .where(eq(flashcards.deckId, source.id))
    .orderBy(asc(flashcards.createdAt))

  const [deck] = await db
    .insert(decks)
    .values({
      userId,
      languageId,
      name: source.name,
      description: source.description,
      kind: 'vocab',
    })
    .returning({ id: decks.id })

  if (cards.length > 0) {
    await insertCardsBulk(
      userId,
      deck.id,
      cards.map((c) => ({ front: c.front, back: c.back })),
    )
  }

  return deck.id
}
