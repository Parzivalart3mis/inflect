import { describe, expect, it } from 'vitest'

import {
  cardCreateSchema,
  coachTokenSchema,
  languageCreateSchema,
  ratingSchema,
} from './index'

const UUID = '00000000-0000-4000-8000-000000000000'

describe('languageCreateSchema', () => {
  it('accepts a well-formed language', () => {
    const r = languageCreateSchema.safeParse({
      name: 'Spanish',
      localeCode: 'es-ES',
      flagEmoji: '🇪🇸',
    })
    expect(r.success).toBe(true)
  })

  it('rejects a malformed locale code', () => {
    const r = languageCreateSchema.safeParse({
      name: 'Spanish',
      localeCode: 'spanish',
      flagEmoji: '🇪🇸',
    })
    expect(r.success).toBe(false)
  })

  it('rejects a non-emoji flag', () => {
    const r = languageCreateSchema.safeParse({
      name: 'Spanish',
      localeCode: 'es-ES',
      flagEmoji: 'ES',
    })
    expect(r.success).toBe(false)
  })
})

describe('ratingSchema', () => {
  it('accepts the four ratings', () => {
    for (const rating of ['again', 'hard', 'good', 'easy']) {
      expect(ratingSchema.safeParse({ rating }).success).toBe(true)
    }
  })
  it('rejects unknown ratings', () => {
    expect(ratingSchema.safeParse({ rating: 'meh' }).success).toBe(false)
  })
})

describe('cardCreateSchema', () => {
  it('requires a non-empty front', () => {
    expect(cardCreateSchema.safeParse({ front: '' }).success).toBe(false)
    expect(cardCreateSchema.safeParse({ front: 'ser' }).success).toBe(true)
  })
  it('rejects a front over 1000 chars', () => {
    expect(
      cardCreateSchema.safeParse({ front: 'x'.repeat(1001) }).success,
    ).toBe(false)
  })
})

describe('coachTokenSchema', () => {
  it('caps focus decks at 5', () => {
    expect(
      coachTokenSchema.safeParse({
        languageId: UUID,
        deckIds: Array(6).fill(UUID),
      }).success,
    ).toBe(false)
    expect(
      coachTokenSchema.safeParse({
        languageId: UUID,
        deckIds: Array(5).fill(UUID),
      }).success,
    ).toBe(true)
  })
})
