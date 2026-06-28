import { AlertTriangle } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div
      role="alert"
      className="border-destructive/30 bg-destructive/5 text-foreground flex flex-col items-center gap-3 rounded-xl border px-6 py-10 text-center"
    >
      <AlertTriangle className="text-destructive size-6" aria-hidden />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
