import { NextResponse } from 'next/server'

import { Errors, route } from '@/lib/api'
import { shareDeck, unshareDeck } from '@/lib/db/sharing'
import { getOrCreateUser } from '@/lib/db/user'
import { enforceRateLimit } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ deckId: string }> }

/** Enable public sharing for a deck; returns its share token. */
export const POST = route(async (_request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  await enforceRateLimit('write', user.id)
  const { deckId } = await ctx.params

  const token = await shareDeck(user.id, deckId)
  if (!token) throw Errors.notFound('Deck')

  return NextResponse.json({ shareToken: token })
})

/** Revoke a deck's share link. */
export const DELETE = route(async (_request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  await enforceRateLimit('write', user.id)
  const { deckId } = await ctx.params

  const ok = await unshareDeck(user.id, deckId)
  if (!ok) throw Errors.notFound('Deck')

  return NextResponse.json({ ok: true })
})
