import { NextResponse } from 'next/server'

import { Errors, parseBody, requireUser, route } from '@/lib/api'
import { db } from '@/lib/db'
import { notes } from '@/lib/db/schema'
import { listNotes } from '@/lib/db/notes'
import { getOrCreateUser } from '@/lib/db/user'
import { getOwnedLanguage } from '@/lib/db/workspace'
import { enforceRateLimit } from '@/lib/rate-limit'
import { noteCreateSchema } from '@/lib/validations'

function deriveTitle(title: string | undefined, content: string): string {
  if (title && title.trim()) return title.trim().slice(0, 200)
  const firstLine = content
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0)
  return (firstLine ?? 'Untitled').slice(0, 200)
}

export const GET = route(async (request: Request) => {
  const userId = await requireUser()
  const { searchParams } = new URL(request.url)
  const languageId = searchParams.get('languageId')
  if (!languageId) throw Errors.badRequest('languageId is required')

  const q = searchParams.get('q') ?? undefined
  const page = Math.max(0, Number(searchParams.get('page') ?? '0') || 0)

  const result = await listNotes({ userId, languageId, q, page })
  return NextResponse.json(result)
})

export const POST = route(async (request: Request) => {
  const user = await getOrCreateUser()
  const body = await parseBody(request, noteCreateSchema)

  const language = await getOwnedLanguage(user.id, body.languageId)
  if (!language) throw Errors.notFound('Language')

  await enforceRateLimit('noteWrite', user.id, 'Too many note saves this hour')

  const [created] = await db
    .insert(notes)
    .values({
      userId: user.id,
      languageId: body.languageId,
      title: deriveTitle(body.title, body.content),
      content: body.content,
    })
    .returning()

  return NextResponse.json(
    {
      id: created.id,
      languageId: created.languageId,
      title: created.title,
      content: created.content,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    },
    { status: 201 },
  )
})
