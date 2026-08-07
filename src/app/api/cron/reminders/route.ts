import { and, count, eq, isNull, lte, or } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { db } from '@/lib/db'
import { endOfToday } from '@/lib/db/cards'
import { flashcards, pushSubscriptions, srsProgress, users } from '@/lib/db/schema'
import { pushConfigured, sendToUser } from '@/lib/push'

// Runs on a schedule (Vercel Cron) with no client open. Sends a review reminder
// to any user who has cards due today and hasn't studied yet today.
export const dynamic = 'force-dynamic'

function sameUtcDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'cron_unconfigured' }, { status: 503 })
  }
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!pushConfigured) {
    return NextResponse.json({ error: 'push_unconfigured' }, { status: 503 })
  }

  const now = new Date()
  const cutoff = endOfToday(now)

  // Only users who have at least one push subscription can be notified.
  const subscribers = await db
    .selectDistinct({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions)

  let processed = 0
  let notified = 0

  for (const { userId } of subscribers) {
    processed++

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    })
    // Skip anyone who already reviewed today.
    if (user?.lastReviewedAt && sameUtcDay(user.lastReviewedAt, now)) continue

    // Count due cards (due date passed, pinned, or brand-new with no SRS row).
    const [{ due }] = await db
      .select({ due: count() })
      .from(flashcards)
      .leftJoin(srsProgress, eq(srsProgress.cardId, flashcards.id))
      .where(
        and(
          eq(flashcards.userId, userId),
          or(
            lte(srsProgress.dueDate, cutoff),
            eq(flashcards.isPinned, true),
            isNull(srsProgress.id),
          ),
        ),
      )

    if (due === 0) continue

    const streak = user?.streakCount ?? 0
    const body =
      `${due} card${due === 1 ? '' : 's'} due today` +
      (streak >= 2 ? ` — keep your ${streak}-day streak alive!` : '.')

    const { sent } = await sendToUser(userId, {
      title: 'Time to review',
      body,
      url: '/cards',
    })
    if (sent > 0) notified++
  }

  return NextResponse.json({ ok: true, processed, notified })
}
