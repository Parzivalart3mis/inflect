import type { Bucket, Rating } from '@/lib/srs/sm2'

export type { Bucket, Rating }

export type DeckKind = 'grammar' | 'vocab'
export type CoachMode = 'conversation' | 'coach'

export interface BucketCounts {
  new: number
  learning: number
  review: number
  mastered: number
}

export interface LanguageDTO {
  id: string
  name: string
  localeCode: string
  flagEmoji: string
  deckCount: number
  cardCount: number
  dueToday: number
}

export interface DeckDTO {
  id: string
  languageId: string
  name: string
  description: string | null
  kind: DeckKind
  cardCount: number
  dueToday: number
  /** Cards pinned "as difficult" in this deck. */
  pinnedCount: number
  buckets: BucketCounts
  pinnedAt: string | null
  createdAt: string
  /** URL-safe token when the deck is shared publicly; null = private. */
  shareToken: string | null
}

export interface SharedDeckDTO {
  name: string
  description: string | null
  cardCount: number
  languageName: string
  languageFlag: string
  cards: { front: string; back: string | null }[]
}

export interface SrsDTO {
  bucket: Bucket
  dueDate: string
  interval: number
  repetitions: number
  easeFactor: number
  lastRating: Rating | null
  lastReviewedAt: string | null
}

export interface CardDTO {
  id: string
  deckId: string
  deckKind: DeckKind
  front: string
  back: string | null
  hasException: boolean
  isPinned: boolean
  sourceNoteId: string | null
  sourceSessionId: string | null
  createdAt: string
  srs: SrsDTO | null
}

export interface NoteDTO {
  id: string
  languageId: string
  title: string
  content: string
  preview: string
  linkedCardCount: number
  pinnedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ReviewResultDTO {
  nextDueDate: string
  bucket: Bucket
  intervalDays: number
}

export interface CoachSessionDTO {
  id: string
  goal: string | null
  mode: CoachMode
  durationSeconds: number | null
  cardsCreated: number
  startedAt: string
  endedAt: string | null
  transcript: TranscriptEntryDTO[]
}

export interface TranscriptEntryDTO {
  role: 'user' | 'coach'
  text: string
  timestamp: string
}

export interface CoachTokenDTO {
  ephemeralToken: string
  systemPrompt: string
  expiresAt: string
  model: string
}

export interface ProgressDTO {
  streak: number
  lastReviewedAt: string | null
  totalCards: number
  buckets: BucketCounts
  weakestDecks: {
    deckId: string
    deckName: string
    retentionRate: number
  }[]
  coachSessions: {
    total: number
    totalMinutes: number
    lastSessionAt: string | null
  }
  dueToday: number
  reviewHistory: { date: string; reviewed: number }[]
  /** Real per-review counts per day (last ~17 weeks) for the calendar heatmap. */
  heatmap: { date: string; count: number }[]
  /** Weekly retention: % of reviews rated good/easy (last 12 weeks). */
  retention: { week: string; rate: number | null; reviews: number }[]
}
