import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { Errors, parseBody, requireUser, route } from '@/lib/api'
import { db } from '@/lib/db'
import { decks } from '@/lib/db/schema'
import { getOwnedDeck } from '@/lib/db/cards'
import { getOrCreateUser } from '@/lib/db/user'
import { deckUpdateSchema } from '@/lib/validations'

type Ctx = { params: Promise<{ deckId: string }> }

export const PATCH = route(async (request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  const { deckId } = await ctx.params
  const body = await parseBody(request, deckUpdateSchema)

  const existing = await getOwnedDeck(user.id, deckId)
  if (!existing) throw Errors.notFound('Deck')

  const [updated] = await db
    .update(decks)
    .set({
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.description !== undefined
        ? { description: body.description }
        : {}),
    })
    .where(and(eq(decks.id, deckId), eq(decks.userId, user.id)))
    .returning()

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    description: updated.description,
  })
})

export const DELETE = route(async (_request: Request, ctx: Ctx) => {
  const userId = await requireUser()
  const { deckId } = await ctx.params

  const existing = await getOwnedDeck(userId, deckId)
  if (!existing) throw Errors.notFound('Deck')

  // Cascades to flashcards + srs_progress via FK onDelete.
  await db.delete(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
  return NextResponse.json({ ok: true })
})
