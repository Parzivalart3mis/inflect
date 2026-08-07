import { and, eq, gte } from 'drizzle-orm'

import type { Bucket } from '@/lib/srs/sm2'
import type { ProgressDTO } from '@/types/dto'

import { emptyBuckets, endOfToday } from './cards'
import { db } from './index'
import {
  coachSessions,
  decks,
  flashcards,
  reviewEvents,
  srsProgress,
  users,
} from './schema'

const HEATMAP_DAYS = 119 // ~17 weeks including today

function dayKey(d: Date): string {
  // Local server day, YYYY-MM-DD.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Builds the 30-day review history. Note: the schema stores only the most
 * recent review per card (srs_progress.last_reviewed_at), so this reflects
 * "cards whose latest review fell on that day" — a faithful proxy given there
 * is no per-review events table.
 */
function buildHistory(
  reviewDays: (Date | null)[],
  now: Date,
): { date: string; reviewed: number }[] {
  const counts = new Map<string, number>()
  for (const d of reviewDays) {
    if (!d) continue
    const key = dayKey(d)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const out: { date: string; reviewed: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const day = new Date(now)
    day.setDate(now.getDate() - i)
    const key = dayKey(day)
    out.push({ date: key, reviewed: counts.get(key) ?? 0 })
  }
  return out
}

export async function getProgress(
  userId: string,
  languageId: string,
): Promise<ProgressDTO> {
  const now = new Date()
  const cutoff = endOfToday(now)
  const heatmapSince = new Date(now)
  heatmapSince.setDate(now.getDate() - HEATMAP_DAYS)
  heatmapSince.setHours(0, 0, 0, 0)

  const [user, cards, sessions, events] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db
      .select({
        deckId: decks.id,
        deckName: decks.name,
        isPinned: flashcards.isPinned,
        bucket: srsProgress.bucket,
        dueDate: srsProgress.dueDate,
        lastRating: srsProgress.lastRating,
        lastReviewedAt: srsProgress.lastReviewedAt,
      })
      .from(flashcards)
      .innerJoin(decks, eq(flashcards.deckId, decks.id))
      .leftJoin(srsProgress, eq(srsProgress.cardId, flashcards.id))
      .where(
        and(eq(flashcards.userId, userId), eq(decks.languageId, languageId)),
      ),
    db
      .select({
        duration: coachSessions.durationSeconds,
        startedAt: coachSessions.startedAt,
      })
      .from(coachSessions)
      .where(
        and(
          eq(coachSessions.userId, userId),
          eq(coachSessions.languageId, languageId),
        ),
      ),
    db
      .select({ reviewedAt: reviewEvents.reviewedAt })
      .from(reviewEvents)
      .innerJoin(flashcards, eq(reviewEvents.cardId, flashcards.id))
      .innerJoin(decks, eq(flashcards.deckId, decks.id))
      .where(
        and(
          eq(reviewEvents.userId, userId),
          eq(decks.languageId, languageId),
          gte(reviewEvents.reviewedAt, heatmapSince),
        ),
      ),
  ])

  const buckets = emptyBuckets()
  let dueToday = 0
  const reviewDays: (Date | null)[] = []

  // deckId -> { name, rated, goodOrEasy }
  const deckStats = new Map<
    string,
    { name: string; rated: number; goodOrEasy: number }
  >()

  for (const c of cards) {
    const bucket = (c.bucket ?? 'new') as Bucket
    buckets[bucket] += 1

    if (c.isPinned || !c.dueDate || c.dueDate <= cutoff) dueToday += 1
    reviewDays.push(c.lastReviewedAt ?? null)

    let stat = deckStats.get(c.deckId)
    if (!stat) {
      stat = { name: c.deckName, rated: 0, goodOrEasy: 0 }
      deckStats.set(c.deckId, stat)
    }
    if (c.lastRating) {
      stat.rated += 1
      if (c.lastRating === 'good' || c.lastRating === 'easy') {
        stat.goodOrEasy += 1
      }
    }
  }

  const weakestDecks = [...deckStats.entries()]
    .filter(([, s]) => s.rated > 0)
    .map(([deckId, s]) => ({
      deckId,
      deckName: s.name,
      retentionRate: Math.round((s.goodOrEasy / s.rated) * 100) / 100,
    }))
    .sort((a, b) => a.retentionRate - b.retentionRate)
    .slice(0, 3)

  // Real per-review activity for the calendar heatmap (last ~17 weeks).
  const eventCounts = new Map<string, number>()
  for (const e of events) {
    const k = dayKey(e.reviewedAt)
    eventCounts.set(k, (eventCounts.get(k) ?? 0) + 1)
  }
  const heatmap: { date: string; count: number }[] = []
  for (let i = HEATMAP_DAYS; i >= 0; i--) {
    const day = new Date(now)
    day.setDate(now.getDate() - i)
    const k = dayKey(day)
    heatmap.push({ date: k, count: eventCounts.get(k) ?? 0 })
  }

  const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration ?? 0), 0)
  const lastSessionAt = sessions.reduce<Date | null>((latest, s) => {
    return !latest || s.startedAt > latest ? s.startedAt : latest
  }, null)

  return {
    streak: user?.streakCount ?? 0,
    lastReviewedAt: user?.lastReviewedAt?.toISOString() ?? null,
    totalCards: cards.length,
    buckets,
    weakestDecks,
    coachSessions: {
      total: sessions.length,
      totalMinutes: Math.round(totalSeconds / 60),
      lastSessionAt: lastSessionAt?.toISOString() ?? null,
    },
    dueToday,
    reviewHistory: buildHistory(reviewDays, now),
    heatmap,
  }
}
