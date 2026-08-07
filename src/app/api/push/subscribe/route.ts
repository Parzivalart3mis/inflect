import { NextResponse } from 'next/server'
import { z } from 'zod'

import { parseBody, requireUser, route } from '@/lib/api'
import { enforceRateLimit } from '@/lib/rate-limit'
import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'

const bodySchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  timezone: z.string().max(64).optional(),
})

/** Persist a device's push subscription (upsert by endpoint). */
export const POST = route(async (request: Request) => {
  const userId = await requireUser()
  await enforceRateLimit('write', userId)
  const { subscription, timezone } = await parseBody(request, bodySchema)

  await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      timezone: timezone ?? null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        userId,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        timezone: timezone ?? null,
      },
    })

  return NextResponse.json({ ok: true })
})
