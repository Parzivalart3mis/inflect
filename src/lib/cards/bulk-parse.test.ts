import { describe, expect, it } from 'vitest'

import { parseBulkCards } from './bulk-parse'

describe('parseBulkCards', () => {
  it('parses tab-separated front/back', () => {
    const { cards } = parseBulkCards('ser\tpermanent traits')
    expect(cards).toEqual([{ front: 'ser', back: 'permanent traits' }])
  })

  it('parses pipe-separated front/back', () => {
    const { cards } = parseBulkCards('estar | temporary states')
    expect(cards).toEqual([{ front: 'estar', back: 'temporary states' }])
  })

  it('handles front-only lines (no exception)', () => {
    const { cards } = parseBulkCards('el = the')
    expect(cards).toEqual([{ front: 'el = the' }])
  })

  it('ignores blank lines but counts empty-front lines as skipped', () => {
    const { cards, skipped } = parseBulkCards('a\tb\n\n| only back\nc')
    expect(cards).toEqual([{ front: 'a', back: 'b' }, { front: 'c' }])
    expect(skipped).toBe(1)
  })

  it('joins extra pipe segments into the back', () => {
    const { cards } = parseBulkCards('front | back | more')
    expect(cards[0]).toEqual({ front: 'front', back: 'back | more' })
  })

  it('clamps very long fields to 1000 characters', () => {
    const long = 'x'.repeat(2000)
    const { cards } = parseBulkCards(`${long}\t${long}`)
    expect(cards[0].front).toHaveLength(1000)
    expect(cards[0].back).toHaveLength(1000)
  })

  it('returns nothing for empty input', () => {
    expect(parseBulkCards('   \n  ')).toEqual({ cards: [], skipped: 0 })
  })

  it('imports an Anki plain-text export: skips headers, uses Front/Back, strips HTML', () => {
    const raw = [
      '#separator:tab',
      '#html:true',
      '#columns:Front\tBack\tTags',
      'hola\t<b>hello</b>',
      'gracias\tthank you<br>(informal)\tgreeting',
    ].join('\n')
    const { cards } = parseBulkCards(raw)
    expect(cards).toEqual([
      { front: 'hola', back: 'hello' },
      { front: 'gracias', back: 'thank you\n(informal)' },
    ])
  })

  it('honors a comma separator from the Anki header', () => {
    const { cards } = parseBulkCards('#separator:comma\nhola,hello\ngracias,thanks')
    expect(cards).toEqual([
      { front: 'hola', back: 'hello' },
      { front: 'gracias', back: 'thanks' },
    ])
  })

  it('decodes HTML entities in fields', () => {
    const { cards } = parseBulkCards('#html:true\nTom &amp; Jerry\tpair')
    expect(cards).toEqual([{ front: 'Tom & Jerry', back: 'pair' }])
  })
})
