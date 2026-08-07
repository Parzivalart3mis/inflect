import { NextResponse } from 'next/server'

import { Errors, requireUser, route } from '@/lib/api'
import { searchCards } from '@/lib/db/cards'

export const GET = route(async (request: Request) => {
  const userId = await requireUser()
  const { searchParams } = new URL(request.url)
  const languageId = searchParams.get('languageId')
  if (!languageId) throw Errors.badRequest('languageId is required')

  const q = (searchParams.get('q') ?? '').trim()
  if (q.length < 2) return NextResponse.json({ cards: [] })

  const cards = await searchCards(userId, languageId, q)
  return NextResponse.json({ cards })
})
