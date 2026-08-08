import { NextResponse } from 'next/server'

import { Errors, requireUser, route } from '@/lib/api'
import { listNoteTitles } from '@/lib/db/notes'

/** Note id + title index for resolving [[wiki-style]] links in note content. */
export const GET = route(async (request: Request) => {
  const userId = await requireUser()
  const { searchParams } = new URL(request.url)
  const languageId = searchParams.get('languageId')
  if (!languageId) throw Errors.badRequest('languageId is required')

  const notes = await listNoteTitles(userId, languageId)
  return NextResponse.json({ notes })
})
