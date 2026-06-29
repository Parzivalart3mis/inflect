import { describe, expect, it } from 'vitest'

import { stripPhonetic } from './speak'

describe('stripPhonetic', () => {
  it('drops the parenthetical phonetic and the newline', () => {
    expect(stripPhonetic('quiero\n(KYEH-roh)')).toBe('quiero')
    expect(stripPhonetic('es\n(ess)')).toBe('es')
  })

  it('keeps multi-word targets but strips all parentheticals', () => {
    expect(stripPhonetic('lo (masculine) / la (feminine)\n(loh / lah)')).toBe(
      'lo / la',
    )
  })

  it('preserves trailing punctuation', () => {
    expect(stripPhonetic('voy a...\n(boy ah)')).toBe('voy a...')
  })

  it('leaves a plain word untouched', () => {
    expect(stripPhonetic('hola')).toBe('hola')
  })

  it('collapses surrounding whitespace', () => {
    expect(stripPhonetic('  spaced  ')).toBe('spaced')
  })
})
