/**
 * Seeds a demo workspace: 1 user → Spanish → 3 decks → 10 cards (with
 * exceptions + SRS rows) → 1 note → 1 completed coach session.
 *
 * Run with: pnpm seed
 *
 * To see the data in the UI, set SEED_USER_ID to your Clerk user id (from the
 * Clerk dashboard) before running; otherwise a placeholder demo user is used.
 */
import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { eq } from 'drizzle-orm'

import * as schema from '../src/lib/db/schema'

config({ path: '.env.local' })
config({ path: '.env' })

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const db = drizzle(neon(url), { schema })

const USER_ID = process.env.SEED_USER_ID ?? 'user_seed_demo'
const USER_EMAIL = process.env.SEED_USER_EMAIL ?? 'demo@inflect.app'

type CardSeed = { front: string; back?: string; pinned?: boolean }

const DECKS: { name: string; description: string; cards: CardSeed[] }[] = [
  {
    name: 'Articles',
    description: 'Definite & indefinite articles',
    cards: [
      { front: 'el / la = the (definite)', back: 'Gender must agree with the noun' },
      { front: 'un / una = a/an (indefinite)' },
      { front: 'los / las = the (plural)' },
    ],
  },
  {
    name: 'Verb Conjugation',
    description: 'Present-tense regular verbs',
    cards: [
      { front: '-ar verbs: hablo, hablas, habla', back: 'Irregular: estar → estoy' },
      { front: '-er verbs: como, comes, come' },
      { front: '-ir verbs: vivo, vives, vive' },
      { front: 'tener = to have', back: 'Stem-changes: tengo, tienes', pinned: true },
    ],
  },
  {
    name: 'Ser vs Estar',
    description: 'The two "to be" verbs',
    cards: [
      {
        front: '“ser” is used for permanent traits',
        back: 'Except with emotions and conditions, use estar',
      },
      { front: '“estar” is used for temporary states & location' },
      {
        front: 'ser for time & events',
        back: 'estar for ongoing actions (estar + gerund)',
      },
    ],
  },
]

const NOTE = {
  title: 'Ser vs Estar — my mental model',
  content: `Ser = essence (who/what something fundamentally is): identity, origin, time, professions.
Estar = state (how/where something is right now): location, emotions, conditions, ongoing actions.

Tricky: "Soy aburrido" (I am boring) vs "Estoy aburrido" (I am bored).
The exception I keep forgetting: physical appearance can use estar to mean "looks ... today".`,
}

async function main() {
  console.log(`Seeding for user ${USER_ID}…`)

  await db
    .insert(schema.users)
    .values({ id: USER_ID, email: USER_EMAIL })
    .onConflictDoUpdate({ target: schema.users.id, set: { email: USER_EMAIL } })

  const [language] = await db
    .insert(schema.languages)
    .values({
      userId: USER_ID,
      name: 'Spanish',
      localeCode: 'es-ES',
      flagEmoji: '🇪🇸',
    })
    .returning()

  await db
    .update(schema.users)
    .set({ activeLanguageId: language.id, streakCount: 4, lastReviewedAt: new Date() })
    .where(eq(schema.users.id, USER_ID))

  const [note] = await db
    .insert(schema.notes)
    .values({
      userId: USER_ID,
      languageId: language.id,
      title: NOTE.title,
      content: NOTE.content,
    })
    .returning()

  let cardTotal = 0
  for (const deckSeed of DECKS) {
    const [deck] = await db
      .insert(schema.decks)
      .values({
        userId: USER_ID,
        languageId: language.id,
        name: deckSeed.name,
        description: deckSeed.description,
        cardCount: deckSeed.cards.length,
      })
      .returning()

    for (const c of deckSeed.cards) {
      const [card] = await db
        .insert(schema.flashcards)
        .values({
          userId: USER_ID,
          deckId: deck.id,
          front: c.front,
          back: c.back ?? null,
          isPinned: c.pinned ?? false,
          sourceNoteId: deckSeed.name === 'Ser vs Estar' ? note.id : null,
        })
        .returning()

      await db.insert(schema.srsProgress).values({
        cardId: card.id,
        userId: USER_ID,
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        dueDate: new Date(),
        bucket: 'new',
      })
      cardTotal++
    }
  }

  await db.insert(schema.coachSessions).values({
    userId: USER_ID,
    languageId: language.id,
    goal: 'Practice ser vs estar in conversation',
    durationSeconds: 312,
    cardsCreated: 1,
    endedAt: new Date(),
    transcript: [
      { role: 'coach', text: '¡Hola! ¿Cómo estás hoy?', timestamp: new Date().toISOString() },
      { role: 'user', text: 'Estoy bien, gracias.', timestamp: new Date().toISOString() },
      {
        role: 'coach',
        text: 'Perfecto — usaste "estar" para un estado temporal. ¡Muy bien!',
        timestamp: new Date().toISOString(),
      },
    ],
  })

  console.log(
    `Done: 1 user, 1 language, ${DECKS.length} decks, ${cardTotal} cards, 1 note, 1 session.`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
