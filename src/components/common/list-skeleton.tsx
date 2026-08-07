import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function ListSkeleton({
  rows = 4,
  variant = 'list',
  className,
  itemClassName,
}: {
  rows?: number
  /** 'grid' matches the 2-up card grids on Notes/Cards so there's no reflow. */
  variant?: 'list' | 'grid'
  className?: string
  itemClassName?: string
}) {
  if (variant === 'grid') {
    return (
      <ul className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <li
            key={i}
            className={cn(
              'border-border bg-card flex h-32 flex-col rounded-xl border p-3',
              itemClassName,
            )}
          >
            <Skeleton className="h-3 w-10 rounded-full" />
            <Skeleton className="mt-2.5 h-4 w-3/4" />
            <Skeleton className="mt-1.5 h-4 w-1/2" />
            <Skeleton className="mt-auto h-1.5 w-full rounded-full" />
          </li>
        ))}
      </ul>
    )
  }

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
