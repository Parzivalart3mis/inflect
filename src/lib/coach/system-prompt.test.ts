import { describe, expect, it } from 'vitest'

import { buildSystemPrompt } from './system-prompt'

describe('buildSystemPrompt', () => {
  it('includes the language name and locale', () => {
    const p = buildSystemPrompt({
      languageName: 'Spanish',
      localeCode: 'es-ES',
      cards: [],
      notes: [],
    })
    expect(p).toContain('Spanish language coach')
    expect(p).toContain('locale: es-ES')
  })

  it('renders rules with and without exceptions', () => {
    const p = buildSystemPrompt({
      languageName: 'Spanish',
      localeCode: 'es-ES',
      cards: [
        { front: 'ser = permanent', back: 'except emotions' },
        { front: 'el = the' },
      ],
      notes: [],
    })
    expect(p).toContain('RULE: ser = permanent')
    expect(p).toContain('EXCEPTION: except emotions')
    expect(p).toContain('RULE: el = the')
    // The card with no back should not emit an EXCEPTION line for it.
    expect(p).not.toContain('el = the\n  EXCEPTION')
  })

  it('uses placeholders when there are no cards or notes', () => {
    const p = buildSystemPrompt({
      languageName: 'French',
      localeCode: 'fr-FR',
      cards: [],
      notes: [],
    })
    expect(p).toContain('No flashcards yet')
    expect(p).toContain('No notes yet')
  })

  it('falls back to open practice when no goal is given', () => {
    const p = buildSystemPrompt({
      languageName: 'German',
      localeCode: 'de-DE',
      cards: [],
      notes: [],
    })
    expect(p).toContain('Open practice')
  })

  it('uses a provided session goal', () => {
    const p = buildSystemPrompt({
      languageName: 'German',
      localeCode: 'de-DE',
      cards: [],
      notes: [],
      sessionGoal: 'Practice ordering food',
    })
    expect(p).toContain('Practice ordering food')
  })

  it('always includes the SUGGEST_CARD protocol', () => {
    for (const mode of ['conversation', 'coach'] as const) {
      const p = buildSystemPrompt({
        languageName: 'Italian',
        localeCode: 'it-IT',
        cards: [],
        notes: [],
        mode,
      })
      expect(p).toContain('[SUGGEST_CARD: front=')
    }
  })

  describe('modes', () => {
    const base = {
      languageName: 'Spanish',
      localeCode: 'es-ES',
      cards: [],
      notes: [],
    }

    it('conversation mode speaks only in the target language', () => {
      const p = buildSystemPrompt({ ...base, mode: 'conversation' })
      expect(p).toContain('Speak ONLY in Spanish')
      expect(p).toContain('conversation partner')
    })

    it('coach mode speaks in English', () => {
      const p = buildSystemPrompt({ ...base, mode: 'coach' })
      expect(p).toContain('Speak in ENGLISH')
      expect(p).toContain('language coach')
    })

    it('defaults to coach mode', () => {
      const p = buildSystemPrompt(base)
      expect(p).toContain('Speak in ENGLISH')
    })
  })
})
