import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { Errors, parseBody, route } from '@/lib/api'
import { db } from '@/lib/db'
import { srsProgress, users } from '@/lib/db/schema'
import { getOwnedCard } from '@/lib/db/cards'
import { getOrCreateUser } from '@/lib/db/user'
import { enforceRateLimit } from '@/lib/rate-limit'
import { computeNextState, initialState, type SRSState } from '@/lib/srs/sm2'
import { nextStreak } from '@/lib/srs/streak'
import { ratingSchema } from '@/lib/validations'

type Ctx = { params: Promise<{ cardId: string }> }

export const POST = route(async (request: Request, ctx: Ctx) => {
  const user = await getOrCreateUser()
  const { cardId } = await ctx.params
  const { rating } = await parseBody(request, ratingSchema)

  const card = await getOwnedCard(user.id, cardId)
  if (!card) throw Errors.notFound('Card')

  await enforceRateLimit('review', user.id, 'Too many reviews this hour')

  const now = new Date()
  const existing = await db.query.srsProgress.findFirst({
    where: eq(srsProgress.cardId, cardId),
  })

  const current: SRSState = existing
    ? {
        interval: existing.interval,
        repetitions: existing.repetitions,
        easeFactor: existing.easeFactor,
        dueDate: existing.dueDate,
        bucket: existing.bucket,
      }
    : initialState(now)

  const next = computeNextState(current, rating, now)

  if (existing) {
    await db
      .update(srsProgress)
      .set({
        interval: next.interval,
        repetitions: next.repetitions,
        easeFactor: next.easeFactor,
        dueDate: next.dueDate,
        bucket: next.bucket,
        lastRating: rating,
        lastReviewedAt: now,
      })
      .where(eq(srsProgress.cardId, cardId))
  } else {
    await db.insert(srsProgress).values({
      cardId,
      userId: user.id,
      interval: next.interval,
      repetitions: next.repetitions,
      easeFactor: next.easeFactor,
      dueDate: next.dueDate,
      bucket: next.bucket,
      lastRating: rating,
      lastReviewedAt: now,
    })
  }

  // Maintain the daily streak.
  const streak = nextStreak(user.lastReviewedAt, user.streakCount, now)
  await db
    .update(users)
    .set({ streakCount: streak, lastReviewedAt: now })
    .where(eq(users.id, user.id))

  return NextResponse.json({
    nextDueDate: next.dueDate.toISOString(),
    bucket: next.bucket,
    intervalDays: next.interval,
  })
})
