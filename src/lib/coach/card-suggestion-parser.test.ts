import { describe, expect, it } from 'vitest'

import {
  hasCardSuggestion,
  parseCardSuggestions,
  stripCardSuggestions,
} from './card-suggestion-parser'

describe('parseCardSuggestions', () => {
  it('parses front and back', () => {
    const out = parseCardSuggestions(
      '[SUGGEST_CARD: front="ser is permanent", back="except emotions"]',
    )
    expect(out).toEqual([
      { front: 'ser is permanent', back: 'except emotions' },
    ])
  })

  it('omits the back when blank', () => {
    const out = parseCardSuggestions('[SUGGEST_CARD: front="el = the", back=""]')
    expect(out).toEqual([{ front: 'el = the' }])
  })

  it('parses a suggestion with only a front', () => {
    const out = parseCardSuggestions('[SUGGEST_CARD: front="por vs para"]')
    expect(out).toEqual([{ front: 'por vs para' }])
  })

  it('finds multiple suggestions in one message', () => {
    const text =
      'Try this [SUGGEST_CARD: front="a"] and this [SUGGEST_CARD: front="b", back="c"]'
    expect(parseCardSuggestions(text)).toEqual([
      { front: 'a' },
      { front: 'b', back: 'c' },
    ])
  })

  it('handles escaped quotes inside values', () => {
    const out = parseCardSuggestions(
      '[SUGGEST_CARD: front="say \\"hola\\"", back=""]',
    )
    expect(out[0].front).toBe('say "hola"')
  })

  it('returns nothing when there is no token', () => {
    expect(parseCardSuggestions('just a normal sentence')).toEqual([])
  })
})

describe('hasCardSuggestion', () => {
  it('detects the token', () => {
    expect(hasCardSuggestion('x [SUGGEST_CARD: front="y"]')).toBe(true)
    expect(hasCardSuggestion('no token here')).toBe(false)
  })
})

describe('stripCardSuggestions', () => {
  it('removes tokens for clean transcript display', () => {
    const out = stripCardSuggestions(
      'Great job! [SUGGEST_CARD: front="ser", back=""] Keep going.',
    )
    expect(out).toBe('Great job!  Keep going.'.trim())
    expect(out).not.toContain('SUGGEST_CARD')
  })
})
