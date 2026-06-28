import { Flame } from 'lucide-react'

import { cn } from '@/lib/utils'

export function StreakCounter({
  streak,
  dueToday,
}: {
  streak: number
  dueToday: number
}) {
  const active = streak > 0
  return (
    <div className="border-border bg-card flex items-center gap-4 rounded-2xl border p-5">
      <span
        className={cn(
          'flex size-14 items-center justify-center rounded-full',
          active ? 'bg-cta/15 text-cta' : 'bg-muted text-muted-foreground',
        )}
      >
        <Flame className={cn('size-7', active && 'fill-current')} aria-hidden />
      </span>
      <div className="flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="font-heading text-3xl font-bold">{streak}</span>
          <span className="text-muted-foreground text-sm">
            day{streak === 1 ? '' : 's'}
          </span>
        </div>
        <p className="text-muted-foreground text-sm">
          {active
            ? 'Keep it going — review every day.'
            : 'Review cards every day to build your streak.'}
        </p>
      </div>
      {dueToday > 0 && (
        <div className="text-right">
          <div className="text-cta font-heading text-2xl font-bold">
            {dueToday}
          </div>
          <div className="text-muted-foreground text-xs">due today</div>
        </div>
      )}
    </div>
  )
}
