import { NextResponse } from 'next/server'

import { Errors, requireUser, route } from '@/lib/api'
import { getReviewQueue } from '@/lib/db/review'

export const GET = route(async (request: Request) => {
  const userId = await requireUser()
  const { searchParams } = new URL(request.url)
  const languageId = searchParams.get('languageId')
  if (!languageId) throw Errors.badRequest('languageId is required')
  const deckId = searchParams.get('deckId') ?? undefined
  const pinnedOnly = searchParams.get('pinnedOnly') === '1'
  const kindParam = searchParams.get('kind')
  const kind =
    kindParam === 'vocab' || kindParam === 'grammar' ? kindParam : undefined

  const cards = await getReviewQueue({
    userId,
    languageId,
    deckId,
    pinnedOnly,
    kind,
  })
  return NextResponse.json({ cards })
})
