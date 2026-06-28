import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { parseBody, requireUser, route } from '@/lib/api'
import { db } from '@/lib/db'
import { languages, users } from '@/lib/db/schema'
import { getOrCreateUser } from '@/lib/db/user'
import { listLanguages } from '@/lib/db/workspace'
import { languageCreateSchema } from '@/lib/validations'

export const GET = route(async () => {
  const userId = await requireUser()
  const result = await listLanguages(userId)
  return NextResponse.json(result)
})

export const POST = route(async (request: Request) => {
  const user = await getOrCreateUser()
  const body = await parseBody(request, languageCreateSchema)

  const [created] = await db
    .insert(languages)
    .values({
      userId: user.id,
      name: body.name,
      localeCode: body.localeCode,
      flagEmoji: body.flagEmoji,
    })
    .returning({ id: languages.id })

  // First language becomes the active workspace automatically.
  if (!user.activeLanguageId) {
    await db
      .update(users)
      .set({ activeLanguageId: created.id })
      .where(eq(users.id, user.id))
  }

  return NextResponse.json({ languageId: created.id }, { status: 201 })
})
