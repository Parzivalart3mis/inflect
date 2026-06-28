import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { Errors, parseBody, requireUser, route } from '@/lib/api'
import { db } from '@/lib/db'
import { notes } from '@/lib/db/schema'
import { getNoteWithCards, getOwnedNote } from '@/lib/db/notes'
import { getOrCreateUser } from '@/lib/db/user'
import { enforceRateLimit } from '@/lib/rate-limit'
import { noteUpdateSchema } from '@/lib/validations'

type Ctx = { params: Promise<{ noteId: string }> }

export const GET = route(async (_request: Request, ctx: Ctx) => {
  const userId = await requireUser()
  const { noteId } = await ctx.params
  const result = await getNoteWithCards(userId, noteId)
  if (!result) throw Errors.notFound('Note')
  return NextResponse.json(result)
})

export const PATCH = route(async (request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  const { noteId } = await ctx.params
  const body = await parseBody(request, noteUpdateSchema)

  const existing = await getOwnedNote(user.id, noteId)
  if (!existing) throw Errors.notFound('Note')

  await enforceRateLimit('noteWrite', user.id, 'Too many note saves this hour')

  const nextContent = body.content ?? existing.content
  const nextTitle =
    body.title !== undefined
      ? body.title.slice(0, 200)
      : deriveTitle(existing.title, nextContent)

  const [updated] = await db
    .update(notes)
    .set({ title: nextTitle, content: nextContent, updatedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.userId, user.id)))
    .returning()

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    content: updated.content,
    updatedAt: updated.updatedAt.toISOString(),
  })
})

export const DELETE = route(async (_request: Request, ctx: Ctx) => {
  const userId = await requireUser()
  const { noteId } = await ctx.params

  const existing = await getOwnedNote(userId, noteId)
  if (!existing) throw Errors.notFound('Note')

  await db.delete(notes).where(and(eq(notes.id, noteId), eq(notes.userId, userId)))
  return NextResponse.json({ ok: true })
})

/** Keep the title in sync with the first content line when not user-set. */
function deriveTitle(currentTitle: string, content: string): string {
  if (currentTitle && currentTitle.trim() && currentTitle !== 'Untitled') {
    return currentTitle
  }
  const firstLine = content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0)
  return (firstLine ?? 'Untitled').slice(0, 200)
}