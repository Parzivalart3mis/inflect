import { NextResponse } from 'next/server'

import { Errors, route } from '@/lib/api'
import { getSharedDeck } from '@/lib/db/sharing'

type Ctx = { params: Promise<{ token: string }> }

/** Public read of a shared deck by token — no auth required. */
export const GET = route(async (_request: Request, ctx: Ctx) => {
  const { token } = await ctx.params

  const deck = await getSharedDeck(token)
  if (!deck) throw Errors.notFound('Shared deck')

  return NextResponse.json(deck)
})
