import { eq } from 'drizzle-orm'
import webpush from 'web-push'

import { db } from '@/lib/db'
import { pushSubscriptions } from '@/lib/db/schema'

export const pushConfigured =
  !!process.env.VAPID_PUBLIC_KEY &&
  !!process.env.VAPID_PRIVATE_KEY &&
  !!process.env.VAPID_SUBJECT

if (pushConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  )
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

/**
 * Send a notification to every saved subscription for a user. Delivery happens
 * server-side, so the recipient's app doesn't need to be open. Subscriptions
 * that the push service reports as gone (404/410) are pruned.
 */
export async function sendToUser(
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; removed: number }> {
  if (!pushConfigured) return { sent: 0, removed: 0 }

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))

  const body = JSON.stringify(payload)
  let sent = 0
  let removed = 0

  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      )
      sent++
    } catch (err) {
      const code = (err as { statusCode?: number })?.statusCode
      if (code === 404 || code === 410) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.id, s.id))
        removed++
      }
    }
  }

  return { sent, removed }
}
