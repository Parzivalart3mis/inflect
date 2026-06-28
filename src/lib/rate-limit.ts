import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

import { Errors } from './api'

/**
 * Upstash-backed rate limiting. If the Upstash env vars are not configured
 * (e.g. local dev), limiting is silently disabled so the app stays usable.
 */
const hasUpstash =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN

const redis = hasUpstash ? Redis.fromEnv() : null

function makeLimiter(tokens: number, window: Parameters<typeof Ratelimit.slidingWindow>[1]) {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: false,
    prefix: 'inflect',
  })
}

export const limiters = {
  coachToken: makeLimiter(5, '1 h'), // 5 coach sessions / hour
  review: makeLimiter(100, '1 h'), // 100 card reviews / hour
  noteWrite: makeLimiter(20, '1 h'), // 20 note saves / hour
  write: makeLimiter(60, '1 m'), // general write guard
} as const

type LimiterKey = keyof typeof limiters

/**
 * Enforce a named limiter for a user. Throws ApiError(429) when exceeded.
 * No-ops when Upstash is not configured.
 */
export async function enforceRateLimit(
  key: LimiterKey,
  identifier: string,
  message?: string,
): Promise<void> {
  const limiter = limiters[key]
  if (!limiter) return
  const { success } = await limiter.limit(`${key}:${identifier}`)
  if (!success) throw Errors.rateLimited(message)
}
