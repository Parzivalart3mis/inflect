import { and, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import { parseBody, requireUser, route } from '@/lib/api'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'

const bodySchema = z.object({ endpoint: z.string().url() })

/** Remove a device's saved subscription (turning its reminders off). */
export const POST = route(async (request: Request) => {
  const userId = await requireUser()
  const { endpoint } = await parseBody(request, bodySchema)

  await db
    .delete(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.userId, userId),
        eq(pushSubscriptions.endpoint, endpoint),
      ),
    )

  return NextResponse.json({ ok: true })
})
