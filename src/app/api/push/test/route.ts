import { NextResponse } from 'next/server'

import { ApiError, requireUser, route } from '@/lib/api'
import { pushConfigured, sendToUser } from '@/lib/push'

/**
 * Send a test push to ALL of the signed-in user's saved devices. Because it
 * reads subscriptions from the DB (not the request), you can trigger it from a
 * different device — e.g. your laptop — while the phone's app is fully closed,
 * which is exactly how the scheduled reminders will work.
 */
export const POST = route(async () => {
  const userId = await requireUser()

  if (!pushConfigured) {
    throw new ApiError('push_unconfigured', 'Push is not configured', 503)
  }

  const { sent, removed } = await sendToUser(userId, {
    title: 'Inflect',
    body: 'Push works with the app closed 🎉 — reminders will arrive like this.',
    url: '/notes',
  })

  return NextResponse.json({ ok: true, sent, removed })
})
