import { sql, type SQL } from 'drizzle-orm'
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Postgres `tsvector` custom type for full-text search on notes.
 * Drizzle has no native tsvector, so we declare it explicitly.
 */
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

export const bucketEnum = pgEnum('srs_bucket', [
  'new',
  'learning',
  'review',
  'mastered',
])

export const ratingEnum = pgEnum('srs_rating', [
  'again',
  'hard',
  'good',
  'easy',
])

export const transcriptRoleEnum = pgEnum('transcript_role', ['user', 'coach'])

// ---------------------------------------------------------------------------
// users — keyed by Clerk user id (text). Synced via Clerk webhook.
// ---------------------------------------------------------------------------
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull().unique(),
  // FK -> languages.id (declared lazily to break the circular reference)
  activeLanguageId: uuid('active_language_id'),
  streakCount: integer('streak_count').notNull().default(0),
  lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// ---------------------------------------------------------------------------
// languages — one isolated workspace per language.
// ---------------------------------------------------------------------------
export const languages = pgTable(
  'languages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    localeCode: text('locale_code').notNull(), // e.g. es-ES — drives TTS voice
    flagEmoji: text('flag_emoji').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('languages_user_idx').on(t.userId)],
)

// ---------------------------------------------------------------------------
// decks — topic decks within a language.
// ---------------------------------------------------------------------------
export const decks = pgTable(
  'decks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    languageId: uuid('language_id')
      .notNull()
      .references(() => languages.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    cardCount: integer('card_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('decks_language_idx').on(t.languageId),
    index('decks_user_idx').on(t.userId),
  ],
)

// ---------------------------------------------------------------------------
// notes — free-form rule notebook with Postgres FTS.
// ---------------------------------------------------------------------------
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    languageId: uuid('language_id')
      .notNull()
      .references(() => languages.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default(''),
    content: text('content').notNull().default(''),
    // Generated STORED tsvector — auto-updates on insert/update, no trigger needed.
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      (): SQL =>
        sql`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))`,
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('notes_language_idx').on(t.languageId),
    index('notes_user_idx').on(t.userId),
    index('notes_search_idx').using('gin', t.searchVector),
  ],
)

// ---------------------------------------------------------------------------
// coach_sessions — Gemini Live practice sessions.
// ---------------------------------------------------------------------------
export type TranscriptEntry = {
  role: 'user' | 'coach'
  text: string
  timestamp: string
}

export const coachSessions = pgTable(
  'coach_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    languageId: uuid('language_id')
      .notNull()
      .references(() => languages.id, { onDelete: 'cascade' }),
    goal: text('goal'),
    transcript: jsonb('transcript')
      .$type<TranscriptEntry[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    durationSeconds: integer('duration_seconds'),
    cardsCreated: integer('cards_created').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
  },
  (t) => [
    index('coach_sessions_user_started_idx').on(t.userId, t.startedAt.desc()),
    index('coach_sessions_language_idx').on(t.languageId),
  ],
)

// ---------------------------------------------------------------------------
// flashcards — rule on front, optional exception on back.
// ---------------------------------------------------------------------------
export const flashcards = pgTable(
  'flashcards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deckId: uuid('deck_id')
      .notNull()
      .references(() => decks.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    front: text('front').notNull(), // the grammar rule
    back: text('back'), // the exception — null = no ! badge
    // GENERATED STORED — true when an exception exists.
    hasException: boolean('has_exception').generatedAlwaysAs(
      (): SQL => sql`(back IS NOT NULL)`,
    ),
    isPinned: boolean('is_pinned').notNull().default(false),
    sourceNoteId: uuid('source_note_id').references(() => notes.id, {
      onDelete: 'set null',
    }),
    sourceSessionId: uuid('source_session_id').references(
      () => coachSessions.id,
      { onDelete: 'set null' },
    ),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('flashcards_deck_idx').on(t.deckId),
    index('flashcards_user_idx').on(t.userId),
    index('flashcards_source_note_idx').on(t.sourceNoteId),
  ],
)

// ---------------------------------------------------------------------------
// srs_progress — one row per flashcard, SM-2 state.
// ---------------------------------------------------------------------------
export const srsProgress = pgTable(
  'srs_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cardId: uuid('card_id')
      .notNull()
      .references(() => flashcards.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    interval: integer('interval').notNull().default(1), // days until next review
    repetitions: integer('repetitions').notNull().default(0),
    easeFactor: real('ease_factor').notNull().default(2.5),
    dueDate: timestamp('due_date', { withTimezone: true })
      .notNull()
      .defaultNow(),
    bucket: bucketEnum('bucket').notNull().default('new'),
    lastRating: ratingEnum('last_rating'),
    lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }),
  },
  (t) => [
    index('srs_user_due_idx').on(t.userId, t.dueDate),
    uniqueIndex('srs_card_idx').on(t.cardId),
    index('srs_bucket_idx').on(t.bucket),
  ],
)

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type User = typeof users.$inferSelect
export type Language = typeof languages.$inferSelect
export type Deck = typeof decks.$inferSelect
export type Flashcard = typeof flashcards.$inferSelect
export type SrsProgress = typeof srsProgress.$inferSelect
export type Note = typeof notes.$inferSelect
export type CoachSession = typeof coachSessions.$inferSelect

export type NewLanguage = typeof languages.$inferInsert
export type NewDeck = typeof decks.$inferInsert
export type NewFlashcard = typeof flashcards.$inferInsert
export type NewNote = typeof notes.$inferInsert
export type NewCoachSession = typeof coachSessions.$inferInsert
