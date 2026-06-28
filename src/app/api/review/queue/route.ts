import { NextResponse } from 'next/server'

import { Errors, requireUser, route } from '@/lib/api'
import { getReviewQueue } from '@/lib/db/review'

export const GET = route(async (request: Request) => {
  const userId = await requireUser()
  const { searchParams } = new URL(request.url)
  const languageId = searchParams.get('languageId')
  if (!languageId) throw Errors.badRequest('languageId is required')
  const deckId = searchParams.get('deckId') ?? undefined

  const cards = await getReviewQueue({ userId, languageId, deckId })
  return NextResponse.json({ cards })
})
