import { NextResponse } from 'next/server'

import { Errors, requireUser, route } from '@/lib/api'
import { getProgress } from '@/lib/db/progress'

export const GET = route(async (request: Request) => {
  const userId = await requireUser()
  const { searchParams } = new URL(request.url)
  const languageId = searchParams.get('languageId')
  if (!languageId) throw Errors.badRequest('languageId is required')

  const progress = await getProgress(userId, languageId)
  return NextResponse.json(progress)
})
