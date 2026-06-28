import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function ListSkeleton({
  rows = 4,
  className,
  itemClassName,
}: {
  rows?: number
  className?: string
  itemClassName?: string
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'border-border bg-card space-y-2 rounded-xl border p-4',
            itemClassName,
          )}
        >
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  )
}
