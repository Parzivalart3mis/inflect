import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { Errors, parseBody, route } from '@/lib/api'
import { db } from '@/lib/db'
import { languages, users } from '@/lib/db/schema'
import { getOrCreateUser } from '@/lib/db/user'
import { activeLanguageSchema } from '@/lib/validations'

export const PATCH = route(async (request: Request) => {
  const user = await getOrCreateUser()
  const { languageId } = await parseBody(request, activeLanguageSchema)

  const owned = await db.query.languages.findFirst({
    where: and(eq(languages.id, languageId), eq(languages.userId, user.id)),
  })
  if (!owned) throw Errors.notFound('Language')

  await db
    .update(users)
    .set({ activeLanguageId: languageId })
    .where(eq(users.id, user.id))

  return NextResponse.json({ ok: true })
})
