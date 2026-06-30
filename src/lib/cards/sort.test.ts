import { describe, expect, it } from 'vitest'

import type { CardDTO } from '@/types/dto'

import { sortCardsForDeck } from './sort'

// The sort only reads `.front`; build minimal cards for the test.
function card(front: string): CardDTO {
  return { front } as CardDTO
}

describe('sortCardsForDeck', () => {
  it('sorts vocab decks alphabetically, case-insensitively', () => {
    const input = ['Zebra', 'apple', 'Mango', 'banana'].map(card)
    const out = sortCardsForDeck(input, 'vocab').map((c) => c.front)
    expect(out).toEqual(['apple', 'banana', 'Mango', 'Zebra'])
  })

  it('leaves grammar decks in their given order', () => {
    const input = ['zebra', 'apple', 'mango'].map(card)
    const out = sortCardsForDeck(input, 'grammar').map((c) => c.front)
    expect(out).toEqual(['zebra', 'apple', 'mango'])
  })

  it('does not mutate the input array', () => {
    const input = ['b', 'a'].map(card)
    sortCardsForDeck(input, 'vocab')
    expect(input.map((c) => c.front)).toEqual(['b', 'a'])
  })
})
