export type Rating = 'again' | 'hard' | 'good' | 'easy'
export type Bucket = 'new' | 'learning' | 'review' | 'mastered'

const QUALITY: Record<Rating, number> = {
  again: 0,
  hard: 2,
  good: 4,
  easy: 5,
}

export interface SRSState {
  interval: number
  repetitions: number
  easeFactor: number
  dueDate: Date
  bucket: Bucket
}

export const MIN_EASE_FACTOR = 1.3

/** Fresh SRS state for a brand-new card (due immediately). */
export function initialState(now: Date = new Date()): SRSState {
  return {
    interval: 0,
    repetitions: 0,
    easeFactor: 2.5,
    dueDate: new Date(now),
    bucket: 'new',
  }
}

/**
 * SM-2 spaced repetition. Pure function — given the current state and a
 * rating, returns the next state. `now` is injectable for deterministic tests.
 */
export function computeNextState(
  state: SRSState,
  rating: Rating,
  now: Date = new Date(),
): SRSState {
  const q = QUALITY[rating]
  let { interval, repetitions, easeFactor } = state

  if (q < 3) {
    // Lapse — reset the learning progress.
    repetitions = 0
    interval = 1
  } else {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * easeFactor)
    repetitions += 1
  }

  easeFactor = Math.max(
    MIN_EASE_FACTOR,
    easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02),
  )

  const dueDate = new Date(now)
  dueDate.setDate(dueDate.getDate() + interval)

  const bucket: Bucket =
    repetitions === 0
      ? 'new'
      : interval <= 1
        ? 'learning'
        : interval >= 21
          ? 'mastered'
          : 'review'

  return { interval, repetitions, easeFactor, dueDate, bucket }
}
