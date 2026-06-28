import { cn } from '@/lib/utils'

export function Wordmark({
  className,
  withMark = true,
}: {
  className?: string
  withMark?: boolean
}) {
  return (
    <span
      className={cn(
        'font-heading text-primary inline-flex items-center gap-1.5 font-semibold tracking-tight',
        className,
      )}
    >
      {withMark && (
        <span aria-hidden className="text-cta italic">
          {'“'}
        </span>
      )}
      Inflect
    </span>
  )
}
