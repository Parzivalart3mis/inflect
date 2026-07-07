import { NextResponse } from 'next/server'

import { Errors, parseBody, requireUser, route } from '@/lib/api'
import { db } from '@/lib/db'
import { decks } from '@/lib/db/schema'
import { listDecks } from '@/lib/db/cards'
import { getOrCreateUser } from '@/lib/db/user'
import { getOwnedLanguage } from '@/lib/db/workspace'
import { deckCreateSchema } from '@/lib/validations'

export const GET = route(async (request: Request) => {
  const userId = await requireUser()
  const { searchParams } = new URL(request.url)
  const languageId = searchParams.get('languageId')
  if (!languageId) throw Errors.badRequest('languageId is required')

  const result = await listDecks(userId, languageId)
  return NextResponse.json(result)
})

export const POST = route(async (request: Request) => {
  const user = await getOrCreateUser()
  const body = await parseBody(request, deckCreateSchema)

  const language = await getOwnedLanguage(user.id, body.languageId)
  if (!language) throw Errors.notFound('Language')

  const [created] = await db
    .insert(decks)
    .values({
      userId: user.id,
      languageId: body.languageId,
      name: body.name,
      description: body.description,
      kind: 'vocab',
    })
    .returning({ id: decks.id })

  return NextResponse.json({ deckId: created.id }, { status: 201 })
})
