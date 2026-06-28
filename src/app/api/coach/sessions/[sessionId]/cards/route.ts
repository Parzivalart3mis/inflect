import { eq, sql } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { Errors, parseBody, route } from '@/lib/api'
import { db } from '@/lib/db'
import { coachSessions } from '@/lib/db/schema'
import { getOwnedDeck, insertCard } from '@/lib/db/cards'
import { getOwnedSession } from '@/lib/db/coach'
import { getOrCreateUser } from '@/lib/db/user'
import { coachSessionCardSchema } from '@/lib/validations'

type Ctx = { params: Promise<{ sessionId: string }> }

export const POST = route(async (request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  const { sessionId } = await ctx.params
  const body = await parseBody(request, coachSessionCardSchema)

  const session = await getOwnedSession(user.id, sessionId)
  if (!session) throw Errors.notFound('Session')

  const deck = await getOwnedDeck(user.id, body.deckId)
  if (!deck) throw Errors.notFound('Deck')

  const card = await insertCard({
    userId: user.id,
    deckId: body.deckId,
    front: body.front,
    back: body.back,
    sourceSessionId: sessionId,
  })

  await db
    .update(coachSessions)
    .set({ cardsCreated: sql`${coachSessions.cardsCreated} + 1` })
    .where(eq(coachSessions.id, sessionId))

  return NextResponse.json(card, { status: 201 })
})
