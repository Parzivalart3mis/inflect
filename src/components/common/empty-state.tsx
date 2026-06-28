import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center',
        className,
      )}
    >
      <span className="bg-cta/15 text-cta flex size-14 items-center justify-center rounded-full">
        <Icon className="size-7" aria-hidden />
      </span>
      <h3 className="font-heading text-foreground text-lg font-semibold">
        {title}
      </h3>
      {description && (
        <p className="text-muted-foreground max-w-xs text-sm text-balance">
          {description}
        </p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
