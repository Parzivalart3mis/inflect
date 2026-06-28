import { NextResponse } from 'next/server'

import { Errors, parseBody, requireUser, route } from '@/lib/api'
import {
  getOwnedDeck,
  insertCard,
  listDeckCards,
} from '@/lib/db/cards'
import { getOwnedNote } from '@/lib/db/notes'
import { getOrCreateUser } from '@/lib/db/user'
import { enforceRateLimit } from '@/lib/rate-limit'
import { cardCreateSchema } from '@/lib/validations'

type Ctx = { params: Promise<{ deckId: string }> }

export const GET = route(async (_request: Request, ctx: Ctx) => {
  const userId = await requireUser()
  const { deckId } = await ctx.params

  const deck = await getOwnedDeck(userId, deckId)
  if (!deck) throw Errors.notFound('Deck')

  const cards = await listDeckCards(userId, deckId)
  return NextResponse.json({ deck, cards })
})

export const POST = route(async (request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  const { deckId } = await ctx.params
  const body = await parseBody(request, cardCreateSchema)

  const deck = await getOwnedDeck(user.id, deckId)
  if (!deck) throw Errors.notFound('Deck')

  // If a source note is provided, it must belong to the user.
  if (body.sourceNoteId) {
    const note = await getOwnedNote(user.id, body.sourceNoteId)
    if (!note) throw Errors.notFound('Note')
  }

  await enforceRateLimit('write', user.id)

  const card = await insertCard({
    userId: user.id,
    deckId,
    front: body.front,
    back: body.back,
    sourceNoteId: body.sourceNoteId,
  })

  return NextResponse.json(card, { status: 201 })
})
