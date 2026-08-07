import { NextResponse } from 'next/server'

import { Errors, parseBody, requireUser, route } from '@/lib/api'
import { enforceRateLimit } from '@/lib/rate-limit'
import { getOwnedSession, saveTranscript, toSessionDTO } from '@/lib/db/coach'
import { getOrCreateUser } from '@/lib/db/user'
import { coachSessionPatchSchema } from '@/lib/validations'

type Ctx = { params: Promise<{ sessionId: string }> }

export const GET = route(async (_request: Request, ctx: Ctx) => {
  const userId = await requireUser()
  const { sessionId } = await ctx.params
  const session = await getOwnedSession(userId, sessionId)
  if (!session) throw Errors.notFound('Session')
  return NextResponse.json(toSessionDTO(session))
})

export const PATCH = route(async (request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  await enforceRateLimit('write', user.id)
  const { sessionId } = await ctx.params
  const body = await parseBody(request, coachSessionPatchSchema)

  const session = await getOwnedSession(user.id, sessionId)
  if (!session) throw Errors.notFound('Session')

  await saveTranscript(
    sessionId,
    user.id,
    body.transcript,
    body.durationSeconds,
  )

  return NextResponse.json({ ok: true })
})
