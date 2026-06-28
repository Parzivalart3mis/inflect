import { and, desc, eq, inArray } from 'drizzle-orm'

import type { PromptCard, PromptNote } from '@/lib/coach/system-prompt'
import type { CoachSessionDTO } from '@/types/dto'

import { db } from './index'
import {
  coachSessions,
  decks,
  flashcards,
  notes,
  type CoachSession,
  type TranscriptEntry,
} from './schema'

const MAX_PROMPT_CARDS = 300
const MAX_PROMPT_NOTES = 40

export interface CoachContext {
  cards: PromptCard[]
  notes: PromptNote[]
}

/** Gathers the user's cards + notes for a language to seed the coach prompt. */
export async function getCoachContext(
  userId: string,
  languageId: string,
  deckIds?: string[],
): Promise<CoachContext> {
  const cardRows = await db
    .select({ front: flashcards.front, back: flashcards.back })
    .from(flashcards)
    .innerJoin(decks, eq(flashcards.deckId, decks.id))
    .where(
      and(
        eq(flashcards.userId, userId),
        eq(decks.languageId, languageId),
        deckIds && deckIds.length > 0
          ? inArray(flashcards.deckId, deckIds)
          : undefined,
      ),
    )
    .orderBy(desc(flashcards.createdAt))
    .limit(MAX_PROMPT_CARDS)

  const noteRows = await db
    .select({ title: notes.title, content: notes.content })
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.languageId, languageId)))
    .orderBy(desc(notes.updatedAt))
    .limit(MAX_PROMPT_NOTES)

  return {
    cards: cardRows.map((c) => ({ front: c.front, back: c.back })),
    notes: noteRows.map((n) => ({ title: n.title, content: n.content })),
  }
}

export function toSessionDTO(row: CoachSession): CoachSessionDTO {
  return {
    id: row.id,
    goal: row.goal,
    durationSeconds: row.durationSeconds,
    cardsCreated: row.cardsCreated,
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    transcript: row.transcript,
  }
}

export async function getOwnedSession(userId: string, sessionId: string) {
  return db.query.coachSessions.findFirst({
    where: and(
      eq(coachSessions.id, sessionId),
      eq(coachSessions.userId, userId),
    ),
  })
}

export async function listSessions(
  userId: string,
  languageId: string,
): Promise<CoachSessionDTO[]> {
  const rows = await db
    .select()
    .from(coachSessions)
    .where(
      and(
        eq(coachSessions.userId, userId),
        eq(coachSessions.languageId, languageId),
      ),
    )
    .orderBy(desc(coachSessions.startedAt))
    .limit(50)
  return rows.map(toSessionDTO)
}

export async function saveTranscript(
  sessionId: string,
  userId: string,
  transcript: TranscriptEntry[],
  durationSeconds: number,
): Promise<void> {
  await db
    .update(coachSessions)
    .set({ transcript, durationSeconds, endedAt: new Date() })
    .where(
      and(eq(coachSessions.id, sessionId), eq(coachSessions.userId, userId)),
    )
}
