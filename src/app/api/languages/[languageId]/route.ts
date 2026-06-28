import { and, eq, ne } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { Errors, requireUser, route } from '@/lib/api'
import { db } from '@/lib/db'
import { languages, users } from '@/lib/db/schema'
import { getOwnedLanguage } from '@/lib/db/workspace'

type Ctx = { params: Promise<{ languageId: string }> }

export const DELETE = route(async (_request: Request, ctx: Ctx) => {
  const userId = await requireUser()
  const { languageId } = await ctx.params

  const language = await getOwnedLanguage(userId, languageId)
  if (!language) throw Errors.notFound('Language')

  // If this was the active workspace, fall back to another language (or null).
  const fallback = await db.query.languages.findFirst({
    where: and(eq(languages.userId, userId), ne(languages.id, languageId)),
  })

  await db
    .update(users)
    .set({ activeLanguageId: fallback?.id ?? null })
    .where(and(eq(users.id, userId), eq(users.activeLanguageId, languageId)))

  // Cascades to decks, flashcards, srs_progress, notes, coach_sessions.
  await db
    .delete(languages)
    .where(and(eq(languages.id, languageId), eq(languages.userId, userId)))

  return NextResponse.json({ ok: true, activeLanguageId: fallback?.id ?? null })
})
