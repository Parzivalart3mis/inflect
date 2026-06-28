import { describe, expect, it } from 'vitest'

import {
  computeNextState,
  initialState,
  MIN_EASE_FACTOR,
  type SRSState,
} from './sm2'

const NOW = new Date('2026-06-27T12:00:00.000Z')

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

describe('initialState', () => {
  it('is a fresh new card due now', () => {
    const s = initialState(NOW)
    expect(s).toMatchObject({
      interval: 0,
      repetitions: 0,
      easeFactor: 2.5,
      bucket: 'new',
    })
    expect(s.dueDate.getTime()).toBe(NOW.getTime())
  })
})

describe('computeNextState — good progression', () => {
  it('first "good": interval 1, learning', () => {
    const next = computeNextState(initialState(NOW), 'good', NOW)
    expect(next.interval).toBe(1)
    expect(next.repetitions).toBe(1)
    expect(next.easeFactor).toBeCloseTo(2.5, 5) // q=4 leaves EF unchanged
    expect(next.bucket).toBe('learning')
    expect(daysBetween(next.dueDate, NOW)).toBe(1)
  })

  it('second "good": interval 6, review', () => {
    const s: SRSState = {
      interval: 1,
      repetitions: 1,
      easeFactor: 2.5,
      dueDate: NOW,
      bucket: 'learning',
    }
    const next = computeNextState(s, 'good', NOW)
    expect(next.interval).toBe(6)
    expect(next.repetitions).toBe(2)
    expect(next.bucket).toBe('review')
  })

  it('third "good": interval = round(interval * EF)', () => {
    const s: SRSState = {
      interval: 6,
      repetitions: 2,
      easeFactor: 2.5,
      dueDate: NOW,
      bucket: 'review',
    }
    const next = computeNextState(s, 'good', NOW)
    expect(next.interval).toBe(15) // round(6 * 2.5)
    expect(next.repetitions).toBe(3)
    expect(next.bucket).toBe('review')
  })

  it('long interval reaches the mastered bucket (>= 21)', () => {
    const s: SRSState = {
      interval: 15,
      repetitions: 3,
      easeFactor: 2.5,
      dueDate: NOW,
      bucket: 'review',
    }
    const next = computeNextState(s, 'good', NOW)
    expect(next.interval).toBe(38) // round(15 * 2.5)
    expect(next.bucket).toBe('mastered')
  })

  it('"easy" raises the ease factor by 0.1', () => {
    const next = computeNextState(initialState(NOW), 'easy', NOW)
    expect(next.easeFactor).toBeCloseTo(2.6, 5)
    expect(next.interval).toBe(1)
    expect(next.bucket).toBe('learning')
  })
})

describe('computeNextState — lapses', () => {
  it('"again" resets repetitions/interval and lowers EF', () => {
    const s: SRSState = {
      interval: 15,
      repetitions: 3,
      easeFactor: 2.5,
      dueDate: NOW,
      bucket: 'mastered',
    }
    const next = computeNextState(s, 'again', NOW)
    expect(next.repetitions).toBe(0)
    expect(next.interval).toBe(1)
    expect(next.easeFactor).toBeCloseTo(1.7, 5) // 2.5 - 0.8
    expect(next.bucket).toBe('new')
  })

  it('"hard" (q=2) is treated as a lapse in this SM-2 variant', () => {
    const s: SRSState = {
      interval: 10,
      repetitions: 4,
      easeFactor: 2.5,
      dueDate: NOW,
      bucket: 'review',
    }
    const next = computeNextState(s, 'hard', NOW)
    expect(next.repetitions).toBe(0)
    expect(next.interval).toBe(1)
    expect(next.easeFactor).toBeCloseTo(2.18, 5) // 2.5 - 0.32
    expect(next.bucket).toBe('new')
  })

  it('ease factor never drops below the minimum', () => {
    const s: SRSState = {
      interval: 1,
      repetitions: 0,
      easeFactor: 1.3,
      dueDate: NOW,
      bucket: 'new',
    }
    const next = computeNextState(s, 'again', NOW)
    expect(next.easeFactor).toBe(MIN_EASE_FACTOR)
  })
})
