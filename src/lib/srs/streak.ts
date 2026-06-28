function startOfDay(d: Date): number {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

const DAY_MS = 86_400_000

/**
 * Server-maintained daily streak.
 * - First ever review → 1
 * - Already reviewed today → unchanged (min 1)
 * - Reviewed yesterday → +1
 * - Any longer gap → reset to 1
 */
export function nextStreak(
  lastReviewedAt: Date | null,
  currentStreak: number,
  now: Date = new Date(),
): number {
  if (!lastReviewedAt) return 1
  const days = Math.round((startOfDay(now) - startOfDay(lastReviewedAt)) / DAY_MS)
  if (days <= 0) return Math.max(currentStreak, 1)
  if (days === 1) return currentStreak + 1
  return 1
}
