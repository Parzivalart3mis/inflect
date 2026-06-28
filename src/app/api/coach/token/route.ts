import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'

import { ApiError, parseBody, route } from '@/lib/api'
import { getCoachContext } from '@/lib/db/coach'
import { getOrCreateUser } from '@/lib/db/user'
import { getOwnedLanguage } from '@/lib/db/workspace'
import { buildSystemPrompt } from '@/lib/coach/system-prompt'
import { enforceRateLimit } from '@/lib/rate-limit'
import { coachTokenSchema } from '@/lib/validations'

const TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes
const SESSION_START_TTL_MS = 2 * 60 * 1000 // must open the live socket within 2 min

export const POST = route(async (request: Request) => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new ApiError(
      'coach_unconfigured',
      'The AI coach is not configured on this server.',
      503,
    )
  }

  const user = await getOrCreateUser()
  const body = await parseBody(request, coachTokenSchema)

  const language = await getOwnedLanguage(user.id, body.languageId)
  if (!language) throw new ApiError('not_found', 'Language not found', 404)

  await enforceRateLimit(
    'coachToken',
    user.id,
    'Session limit reached — try again in an hour',
  )

  const { cards, notes } = await getCoachContext(
    user.id,
    body.languageId,
    body.deckIds,
  )

  const systemPrompt = buildSystemPrompt({
    languageName: language.name,
    localeCode: language.localeCode,
    cards,
    notes,
    sessionGoal: body.sessionGoal,
  })

  const model = process.env.GEMINI_LIVE_MODEL ?? 'gemini-2.0-flash-live-001'

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: { apiVersion: 'v1alpha' },
  })

  const now = Date.now()
  const expiresAt = new Date(now + TOKEN_TTL_MS)

  const token = await ai.authTokens.create({
    config: {
      uses: 1,
      expireTime: expiresAt.toISOString(),
      newSessionExpireTime: new Date(now + SESSION_START_TTL_MS).toISOString(),
      httpOptions: { apiVersion: 'v1alpha' },
    },
  })

  if (!token.name) {
    throw new ApiError('token_error', 'Failed to create coach token', 502)
  }

  return NextResponse.json({
    ephemeralToken: token.name,
    systemPrompt,
    model,
    expiresAt: expiresAt.toISOString(),
  })
})
