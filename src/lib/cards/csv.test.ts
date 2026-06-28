import { describe, expect, it } from 'vitest'

import { slugifyFilename, toCsv } from './csv'

describe('toCsv', () => {
  it('builds a header + rows with CRLF endings', () => {
    const csv = toCsv(['front', 'back'], [['a', 'b']])
    expect(csv).toBe('front,back\r\na,b')
  })

  it('quotes and escapes fields with commas, quotes, or newlines', () => {
    const csv = toCsv(
      ['front', 'back'],
      [['has, comma', 'has "quote"'], ['line\nbreak', '']],
    )
    expect(csv).toBe(
      'front,back\r\n"has, comma","has ""quote"""\r\n"line\nbreak",',
    )
  })

  it('renders booleans and nulls', () => {
    const csv = toCsv(['a', 'b', 'c'], [[true, false, null]])
    expect(csv).toBe('a,b,c\r\ntrue,false,')
  })
})

describe('slugifyFilename', () => {
  it('lowercases and dashes', () => {
    expect(slugifyFilename('Ser vs Estar')).toBe('ser-vs-estar')
  })

  it('falls back to "deck" when empty', () => {
    expect(slugifyFilename('!!!')).toBe('deck')
  })
})
