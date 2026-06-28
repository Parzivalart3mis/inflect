import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { Errors, parseBody, requireUser, route } from '@/lib/api'
import { db } from '@/lib/db'
import { flashcards, srsProgress } from '@/lib/db/schema'
import { getOwnedCard, recountDeck, toCardDTO } from '@/lib/db/cards'
import { getOrCreateUser } from '@/lib/db/user'
import { cardUpdateSchema } from '@/lib/validations'

type Ctx = { params: Promise<{ cardId: string }> }

export const PATCH = route(async (request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  const { cardId } = await ctx.params
  const body = await parseBody(request, cardUpdateSchema)

  const existing = await getOwnedCard(user.id, cardId)
  if (!existing) throw Errors.notFound('Card')

  const [updated] = await db
    .update(flashcards)
    .set({
      ...(body.front !== undefined ? { front: body.front } : {}),
      ...(body.back !== undefined ? { back: body.back } : {}),
      ...(body.isPinned !== undefined ? { isPinned: body.isPinned } : {}),
    })
    .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, user.id)))
    .returning()

  const srs = await db.query.srsProgress.findFirst({
    where: eq(srsProgress.cardId, cardId),
  })

  return NextResponse.json(toCardDTO(updated, srs ?? null))
})

export const DELETE = route(async (_request: Request, ctx: Ctx) => {
  const userId = await requireUser()
  const { cardId } = await ctx.params

  const existing = await getOwnedCard(userId, cardId)
  if (!existing) throw Errors.notFound('Card')

  await db
    .delete(flashcards)
    .where(and(eq(flashcards.id, cardId), eq(flashcards.userId, userId)))
  await recountDeck(existing.deckId)

  return NextResponse.json({ ok: true })
})
