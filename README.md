# Inflect

> Your grammar notebook, your flashcard deck, and your personal AI language coach — one app, one shared context, one warm place to learn.

Inflect combines three things language learners normally juggle across separate
apps:

- **Notes** — a free-form rule notebook per language with full-text search.
- **Flashcards** — SRS decks with a circled **!** badge on cards that carry an
  exception, a smooth 3D flip, TTS, bulk import, and CSV export.
- **AI Coach** — a Gemini Live voice/video session that has full context of
  everything you've written, quizzes you on your own cards, corrects
  pronunciation live, and can create new cards mid-session.

Everything lives inside a per-language **workspace** so your Spanish and your
Japanese never bleed into each other.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (`base-nova`, on Base UI) + Lucide |
| Animation | Framer Motion (3D card flip, page transitions) |
| Database | Neon Postgres + Drizzle ORM (native `tsvector` FTS, `jsonb` transcripts) |
| Auth | Clerk |
| AI Coach | Gemini Live API (client-direct, ephemeral token from the server) |
| TTS | Web Speech API (`speechSynthesis`) |
| SRS | Custom SM-2 (`src/lib/srs/sm2.ts`), fully unit-tested |
| Rate limiting | Upstash Redis (no-ops when unconfigured) |
| Error tracking | Sentry (PII-scrubbing `beforeSend`) |
| PWA | Serwist |
| Charts | Recharts |

## Getting started

```bash
pnpm install
cp .env.example .env.local   # fill in the values you have
pnpm dev
```

### Environment variables

See [.env.example](.env.example). The app degrades gracefully when optional
services are missing:

- **Required for real use:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
  `CLERK_SECRET_KEY`, `DATABASE_URL`.
- **AI coach:** `GEMINI_API_KEY` (server-only — the client only ever receives a
  15-minute ephemeral token).
- **Optional:** Upstash (rate limiting — skipped when unset), Sentry (error
  tracking — skipped when unset), Vercel Blob.

### Database

```bash
pnpm db:generate   # generate SQL migrations from src/lib/db/schema.ts
pnpm db:push       # push the schema to your Neon branch
pnpm seed          # seed a demo Spanish workspace (3 decks, 10 cards, a note, a session)
```

To see seed data in the UI, set `SEED_USER_ID` to your Clerk user id (from the
Clerk dashboard) before running `pnpm seed`.

Notes FTS uses a **generated `tsvector` STORED column** with a GIN index — it
auto-updates on every insert/update, so no trigger is needed.

### Clerk webhook

Point a Clerk webhook at `POST /api/webhooks/clerk` (events `user.created`,
`user.updated`, `user.deleted`) and set `CLERK_WEBHOOK_SECRET`. The app also
self-heals: any authenticated user missing from the DB is created on first
request.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack; the service worker is disabled in dev) |
| `pnpm build` | Production build (**uses `--webpack`**, see note below) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit suite |
| `pnpm icons` | Regenerate PWA icons + iOS splash screens (sharp) |
| `pnpm db:generate / db:push / db:studio` | Drizzle |
| `pnpm seed` | Seed demo data |

### Why `--webpack` for the build?

`@serwist/next` injects a webpack config to bundle the service worker, and Next
16's default Turbopack builder rejects projects with a webpack config. The build
therefore runs on webpack; dev stays on Turbopack (where Serwist is disabled).

## Testing

- **Unit (Vitest):** SM-2 (every edge case), the streak rule, the bulk-import
  parser, CSV export, the coach system-prompt builder, the `[SUGGEST_CARD]`
  parser, and the Zod schemas. Run with `pnpm test`.
- **E2E (Playwright):** `e2e/smoke.spec.ts` covers the unauthenticated redirect
  and the manifest. Authenticated flows (note → card → review, coach start/end)
  need Clerk test credentials + a seeded DB via a `storageState` global-setup.

## AI Coach architecture

```
Browser ──POST /api/coach/token──▶ Vercel function
        ◀── { ephemeralToken, systemPrompt, model }   (built from your cards + notes)
Browser ──WebSocket──▶ Gemini Live API (real-time audio + video)
```

The `GEMINI_API_KEY` never reaches the client. The system prompt is assembled
server-side from the user's flashcards and notes. The client streams 16 kHz PCM
mic audio, plays back 24 kHz model audio, accumulates input/output
transcriptions, and watches for `[SUGGEST_CARD: front="…", back="…"]` tokens to
surface a "save to deck" toast.

> The Gemini Live realtime connection is the one part that genuinely needs a
> device + key to validate end-to-end (audio capture/playback, the gesture-gated
> AudioContext on iOS). The plumbing is built against `@google/genai`'s Live
> API; treat a first live call as a smoke test.

## PWA / iPhone

Installable from Safari (Share → Add to Home Screen): standalone display,
black-translucent status bar, safe-area insets, no-zoom enforcement (16px inputs
+ `touch-action: manipulation`), and `apple-touch-startup-image` splash screens.
Icons and splashes are generated by `pnpm icons`.

## Project layout

```
src/
  app/                # routes: (app) shell group, api/, auth pages, sw.ts
  components/         # ui/ (shadcn), flashcard/, coach/, notes/, progress/, layout/
  hooks/              # useCoachSession, useAutoSave, useReviewHotkeys, …
  lib/                # db/ (schema + queries), srs/, coach/, cards/, validations/
  types/              # shared DTOs
drizzle/migrations/   # generated SQL
scripts/              # seed.ts, generate-icons.mjs
e2e/                  # Playwright specs
```

## Security

Clerk sessions, Zod on every route boundary, per-resource ownership checks
(`userId === auth().userId`), Upstash rate limits on coach/review/note-write,
a CSP that allows the Gemini Live socket while blocking foreign frames
(`frame-ancestors 'none'`), and Sentry `beforeSend` stripping email + request
bodies.
