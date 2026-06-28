import { NextResponse } from 'next/server'

import { Errors, parseBody, route } from '@/lib/api'
import { getOwnedDeck, insertCardsBulk } from '@/lib/db/cards'
import { getOrCreateUser } from '@/lib/db/user'
import { enforceRateLimit } from '@/lib/rate-limit'
import { parseBulkCards } from '@/lib/cards/bulk-parse'
import { cardBulkSchema } from '@/lib/validations'

type Ctx = { params: Promise<{ deckId: string }> }

const MAX_BULK = 500

export const POST = route(async (request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  const { deckId } = await ctx.params
  const body = await parseBody(request, cardBulkSchema)

  const deck = await getOwnedDeck(user.id, deckId)
  if (!deck) throw Errors.notFound('Deck')

  await enforceRateLimit('write', user.id)

  const { cards, skipped } = parseBulkCards(body.raw)
  if (cards.length === 0) {
    return NextResponse.json({ created: 0, skipped, cards: [] })
  }

  const toInsert = cards.slice(0, MAX_BULK)
  const created = await insertCardsBulk(user.id, deckId, toInsert)

  return NextResponse.json({
    created: created.length,
    skipped: skipped + (cards.length - toInsert.length),
    cards: created,
  })
})
