'use client'

import { useEffect } from 'react'

/**
 * Root-level boundary — catches errors in the root/(app) layout itself (e.g. a
 * failed RSC render on router.refresh, or a stale chunk after deploy). Replaces
 * the whole document, so it ships its own minimal styling.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global error boundary]', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          textAlign: 'center',
          background: '#FDF8F2',
          color: '#2D1A0A',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
          This page couldn’t load
        </h1>
        <p style={{ color: '#7A6650', maxWidth: 320, margin: 0 }}>
          Reload to get the latest version, or try again.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => reset()}
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              border: '1px solid #DDD3C4',
              background: '#F0E9DC',
              color: '#2D1A0A',
              fontWeight: 500,
            }}
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 16px',
              borderRadius: 12,
              border: 'none',
              background: '#E8943A',
              color: '#2D1A0A',
              fontWeight: 600,
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
