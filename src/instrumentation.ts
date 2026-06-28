import * as Sentry from '@sentry/nextjs'

import { scrubEvent } from '@/lib/sentry-scrub'

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  if (
    process.env.NEXT_RUNTIME === 'nodejs' ||
    process.env.NEXT_RUNTIME === 'edge'
  ) {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
      beforeSend: scrubEvent,
    })
  }
}

export const onRequestError = Sentry.captureRequestError
