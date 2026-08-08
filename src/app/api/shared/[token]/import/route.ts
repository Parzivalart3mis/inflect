import { NextResponse } from 'next/server'
import { z } from 'zod'

import { Errors, parseBody, route } from '@/lib/api'
import { importSharedDeck } from '@/lib/db/sharing'
import { getOrCreateUser } from '@/lib/db/user'
import { getOwnedLanguage } from '@/lib/db/workspace'
import { enforceRateLimit } from '@/lib/rate-limit'

type Ctx = { params: Promise<{ token: string }> }

const importSchema = z.object({ languageId: z.string().uuid() })

/** Copy a shared deck into one of the signed-in user's languages. */
export const POST = route(async (request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  await enforceRateLimit('write', user.id)
  const { token } = await ctx.params
  const { languageId } = await parseBody(request, importSchema)

  const language = await getOwnedLanguage(user.id, languageId)
  if (!language) throw Errors.notFound('Language')

  const deckId = await importSharedDeck(user.id, token, languageId)
  if (!deckId) throw Errors.notFound('Shared deck')

  return NextResponse.json({ deckId }, { status: 201 })
})
