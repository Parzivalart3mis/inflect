import { NextResponse } from 'next/server'

import { Errors, parseBody, requireUser, route } from '@/lib/api'
import { db } from '@/lib/db'
import { coachSessions } from '@/lib/db/schema'
import { listSessions } from '@/lib/db/coach'
import { getOrCreateUser } from '@/lib/db/user'
import { getOwnedLanguage } from '@/lib/db/workspace'
import { coachSessionCreateSchema } from '@/lib/validations'

export const GET = route(async (request: Request) => {
  const userId = await requireUser()
  const { searchParams } = new URL(request.url)
  const languageId = searchParams.get('languageId')
  if (!languageId) throw Errors.badRequest('languageId is required')

  const sessions = await listSessions(userId, languageId)
  return NextResponse.json({ sessions })
})

export const POST = route(async (request: Request) => {
  const user = await getOrCreateUser()
  const body = await parseBody(request, coachSessionCreateSchema)

  const language = await getOwnedLanguage(user.id, body.languageId)
  if (!language) throw Errors.notFound('Language')

  const [created] = await db
    .insert(coachSessions)
    .values({
      userId: user.id,
      languageId: body.languageId,
      goal: body.goal,
    })
    .returning({ id: coachSessions.id })

  return NextResponse.json({ sessionId: created.id }, { status: 201 })
})
