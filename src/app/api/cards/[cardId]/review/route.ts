import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { Errors, parseBody, route } from '@/lib/api'
import { db } from '@/lib/db'
import {
  flashcards,
  reviewEvents,
  srsProgress,
  users,
} from '@/lib/db/schema'
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
  const lapses = (existing?.lapses ?? 0) + (rating === 'again' ? 1 : 0)

  if (existing) {
    await db
      .update(srsProgress)
      .set({
        interval: next.interval,
        repetitions: next.repetitions,
        easeFactor: next.easeFactor,
        dueDate: next.dueDate,
        bucket: next.bucket,
        lapses,
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
      lapses,
      lastRating: rating,
      lastReviewedAt: now,
    })
  }

  // Leech: a card failed many times. Auto-pin it as "difficult" so it surfaces
  // in Practice difficult (only the first time it crosses the threshold).
  const LEECH_LAPSES = 4
  const leeched =
    rating === 'again' && lapses >= LEECH_LAPSES && !card.isPinned
  if (leeched) {
    await db
      .update(flashcards)
      .set({ isPinned: true })
      .where(eq(flashcards.id, cardId))
  }

  // Log the review event (accurate activity/retention history).
  await db.insert(reviewEvents).values({
    userId: user.id,
    cardId,
    rating,
    reviewedAt: now,
  })

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
    leeched,
  })
})
