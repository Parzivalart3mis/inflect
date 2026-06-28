import withSerwistInit from '@serwist/next'
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

// Content-Security-Policy — allows Clerk, Gemini Live (wss), Upstash, Sentry,
// Google Fonts; blocks foreign frames (frame-ancestors 'none').
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Clerk + Next require inline/eval; keep script sources broad but first-party-leaning.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "media-src 'self' blob: data:",
  "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
  // Gemini Live WebSocket + REST, Clerk, Upstash, Sentry, Vercel Blob.
  "connect-src 'self' https: wss: https://generativelanguage.googleapis.com wss://generativelanguage.googleapis.com",
]
  .join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=()',
  },
]

const baseConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'img.clerk.com' },
    ],
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV !== 'production',
})

const config = withSerwist(baseConfig)

// Only run Sentry's build-time wrapper when configured, to keep local builds clean.
const sentryConfigured =
  !!process.env.NEXT_PUBLIC_SENTRY_DSN || !!process.env.SENTRY_AUTH_TOKEN

export default sentryConfigured
  ? withSentryConfig(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: true,
      widenClientFileUpload: true,
      disableLogger: true,
    })
  : config
