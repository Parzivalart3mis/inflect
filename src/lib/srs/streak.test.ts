import { describe, expect, it } from 'vitest'

import { nextStreak } from './streak'

// Built from local date components so the "server day" (local midnight) logic
// is deterministic regardless of the test machine's timezone.
const NOW = new Date(2026, 5, 27, 12, 0, 0)
const yesterday = new Date(2026, 5, 26, 20, 0, 0)
const today = new Date(2026, 5, 27, 1, 0, 0)
const threeDaysAgo = new Date(2026, 5, 24, 12, 0, 0)

describe('nextStreak', () => {
  it('starts at 1 with no prior review', () => {
    expect(nextStreak(null, 0, NOW)).toBe(1)
  })

  it('keeps the streak when already reviewed today', () => {
    expect(nextStreak(today, 5, NOW)).toBe(5)
  })

  it('never returns 0 for a same-day review', () => {
    expect(nextStreak(today, 0, NOW)).toBe(1)
  })

  it('increments when the last review was yesterday', () => {
    expect(nextStreak(yesterday, 5, NOW)).toBe(6)
  })

  it('resets to 1 after a gap of two or more days', () => {
    expect(nextStreak(threeDaysAgo, 9, NOW)).toBe(1)
  })
})
