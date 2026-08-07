import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { z } from 'zod'

import { ApiError, parseBody, requireUser, route } from '@/lib/api'

const vapidConfigured =
  !!process.env.VAPID_PUBLIC_KEY &&
  !!process.env.VAPID_PRIVATE_KEY &&
  !!process.env.VAPID_SUBJECT

if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  )
}

const bodySchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
})

/**
 * POC: send a single test push to the subscription the client just created.
 * No persistence — this only proves end-to-end delivery on the device.
 */
export const POST = route(async (request: Request) => {
  await requireUser()

  if (!vapidConfigured) {
    throw new ApiError('push_unconfigured', 'Push is not configured', 503)
  }

  const { subscription } = await parseBody(request, bodySchema)

  const payload = JSON.stringify({
    title: 'Inflect',
    body: 'Push is working 🎉 — this is where your review reminders will land.',
    url: '/notes',
  })

  try {
    await webpush.sendNotification(subscription, payload)
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode
    throw new ApiError(
      'push_send_failed',
      status === 404 || status === 410
        ? 'Subscription expired — re-enable notifications and try again.'
        : 'Could not send the test notification.',
      502,
    )
  }

  return NextResponse.json({ ok: true })
})
