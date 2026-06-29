import { z } from 'zod'

const uuid = z.string().uuid()

// Matches at least one emoji pictographic OR regional-indicator (flag) char.
const emoji = z
  .string()
  .min(1)
  .max(16)
  .refine((s) => /[\p{Extended_Pictographic}\p{Regional_Indicator}]/u.test(s), {
    message: 'Must be an emoji',
  })

// ---------------- Languages ----------------
export const languageCreateSchema = z.object({
  name: z.string().min(1).max(60),
  localeCode: z.string().regex(/^[a-z]{2}-[A-Z]{2}$/, 'Expected form like es-ES'),
  flagEmoji: emoji,
})
export type LanguageCreateInput = z.infer<typeof languageCreateSchema>

export const activeLanguageSchema = z.object({
  languageId: uuid,
})

// ---------------- Decks ----------------
export const deckCreateSchema = z.object({
  languageId: uuid,
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  kind: z.enum(['grammar', 'vocab']).optional(),
})
export type DeckCreateInput = z.infer<typeof deckCreateSchema>

export const deckUpdateSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(300).nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.description !== undefined, {
    message: 'Nothing to update',
  })

// ---------------- Cards ----------------
export const cardCreateSchema = z.object({
  front: z.string().min(1).max(1000),
  back: z.string().max(1000).optional(),
  sourceNoteId: uuid.optional(),
})
export type CardCreateInput = z.infer<typeof cardCreateSchema>

export const cardBulkSchema = z.object({
  raw: z.string().max(50_000),
})

export const cardUpdateSchema = z
  .object({
    front: z.string().min(1).max(1000).optional(),
    back: z.string().max(1000).nullable().optional(),
    isPinned: z.boolean().optional(),
  })
  .refine(
    (v) =>
      v.front !== undefined ||
      v.back !== undefined ||
      v.isPinned !== undefined,
    { message: 'Nothing to update' },
  )

export const ratingSchema = z.object({
  rating: z.enum(['again', 'hard', 'good', 'easy']),
})

// ---------------- Notes ----------------
export const noteCreateSchema = z.object({
  languageId: uuid,
  title: z.string().max(200).optional(),
  content: z.string().max(100_000),
})
export type NoteCreateInput = z.infer<typeof noteCreateSchema>

export const noteUpdateSchema = z
  .object({
    title: z.string().max(200).optional(),
    content: z.string().max(100_000).optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, {
    message: 'Nothing to update',
  })

// ---------------- Coach ----------------
export const ttsSchema = z.object({
  text: z.string().min(1).max(500),
  lang: z.string().max(20).optional(),
})

export const coachModeSchema = z.enum(['conversation', 'coach'])

export const coachTokenSchema = z.object({
  languageId: uuid,
  sessionGoal: z.string().max(500).optional(),
  deckIds: z.array(uuid).max(5).optional(),
  mode: coachModeSchema.optional(),
})
export type CoachTokenInput = z.infer<typeof coachTokenSchema>

export const coachSessionCreateSchema = z.object({
  languageId: uuid,
  goal: z.string().max(500).optional(),
  mode: coachModeSchema.optional(),
})

export const transcriptEntrySchema = z.object({
  role: z.enum(['user', 'coach']),
  text: z.string().max(10_000),
  timestamp: z.string(),
})

export const coachSessionPatchSchema = z.object({
  transcript: z.array(transcriptEntrySchema).max(1000),
  durationSeconds: z.number().int().nonnegative(),
})

export const coachSessionCardSchema = z.object({
  deckId: uuid,
  front: z.string().min(1).max(1000),
  back: z.string().max(1000).optional(),
  transcriptSnippet: z.string().max(500).optional(),
})
