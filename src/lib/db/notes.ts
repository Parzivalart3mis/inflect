import { and, count, desc, eq, inArray, sql } from 'drizzle-orm'

import type { CardDTO, NoteDTO } from '@/types/dto'

import { db } from './index'
import { decks, flashcards, notes } from './schema'
import { toCardDTO } from './cards'

const PAGE_SIZE = 20

export function notePreview(content: string): string {
  const firstLine = content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0)
  const text = firstLine ?? ''
  return text.length > 140 ? text.slice(0, 140).trimEnd() + '…' : text
}

function toNoteDTO(
  row: typeof notes.$inferSelect,
  linkedCardCount: number,
): NoteDTO {
  return {
    id: row.id,
    languageId: row.languageId,
    title: row.title,
    content: row.content,
    preview: notePreview(row.content),
    linkedCardCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export interface ListNotesParams {
  userId: string
  languageId: string
  q?: string
  page?: number
}

export async function listNotes({
  userId,
  languageId,
  q,
  page = 0,
}: ListNotesParams): Promise<{ notes: NoteDTO[]; hasMore: boolean }> {
  const base = and(eq(notes.userId, userId), eq(notes.languageId, languageId))

  const trimmed = q?.trim()
  const where =
    trimmed && trimmed.length > 0
      ? and(
          base,
          sql`${notes.searchVector} @@ plainto_tsquery('english', ${trimmed})`,
        )
      : base

  const order =
    trimmed && trimmed.length > 0
      ? desc(
          sql`ts_rank(${notes.searchVector}, plainto_tsquery('english', ${trimmed}))`,
        )
      : desc(notes.updatedAt)

  const rows = await db
    .select()
    .from(notes)
    .where(where)
    .orderBy(order)
    .limit(PAGE_SIZE + 1)
    .offset(page * PAGE_SIZE)

  const hasMore = rows.length > PAGE_SIZE
  const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows

  // Linked card counts for this page.
  const ids = pageRows.map((n) => n.id)
  const countMap = new Map<string, number>()
  if (ids.length) {
    const counts = await db
      .select({ noteId: flashcards.sourceNoteId, value: count() })
      .from(flashcards)
      .where(inArray(flashcards.sourceNoteId, ids))
      .groupBy(flashcards.sourceNoteId)
    for (const c of counts) {
      if (c.noteId) countMap.set(c.noteId, c.value)
    }
  }

  return {
    notes: pageRows.map((n) => toNoteDTO(n, countMap.get(n.id) ?? 0)),
    hasMore,
  }
}

export async function getOwnedNote(userId: string, noteId: string) {
  return db.query.notes.findFirst({
    where: and(eq(notes.id, noteId), eq(notes.userId, userId)),
  })
}

/** A single note plus the flashcards linked to it. */
export async function getNoteWithCards(
  userId: string,
  noteId: string,
): Promise<{ note: NoteDTO; cards: CardDTO[] } | null> {
  const row = await getOwnedNote(userId, noteId)
  if (!row) return null

  const linked = await db
    .select({ card: flashcards, kind: decks.kind })
    .from(flashcards)
    .innerJoin(decks, eq(flashcards.deckId, decks.id))
    .where(eq(flashcards.sourceNoteId, noteId))
    .orderBy(desc(flashcards.createdAt))

  return {
    note: toNoteDTO(row, linked.length),
    cards: linked.map((r) => toCardDTO(r.card, null, r.kind)),
  }
}
