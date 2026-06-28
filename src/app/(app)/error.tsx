'use client'

import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'

import { Button } from '@/components/ui/button'

/**
 * Graceful error boundary for any page under the (app) group. Most production
 * errors here are transient (a failed RSC fetch) or a stale chunk after a new
 * deploy — a hard reload fixes both, so that's the primary action.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app error boundary]', error)
  }, [error])

  const isChunkError =
    /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(
      error?.message ?? '',
    )

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="bg-destructive/10 text-destructive flex size-14 items-center justify-center rounded-full">
        <AlertTriangle className="size-7" aria-hidden />
      </span>
      <div className="space-y-1">
        <h1 className="font-heading text-xl font-semibold">
          Something went wrong
        </h1>
        <p className="text-muted-foreground max-w-xs text-sm text-balance">
          {isChunkError
            ? 'A new version is available. Reload to get the latest.'
            : 'This screen hit a snag. Try again, or reload the app.'}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Button
          className="bg-cta text-cta-foreground hover:bg-cta/90"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="size-4" />
          Reload
        </Button>
      </div>
    </div>
  )
}
