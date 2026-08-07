import { cn } from '@/lib/utils'

/** GitHub-style calendar heatmap of daily reviews (columns = weeks). */
export function ReviewHeatmap({
  data,
}: {
  data: { date: string; count: number }[]
}) {
  if (data.length === 0) return null

  const max = Math.max(1, ...data.map((d) => d.count))
  // Pad the front so the first column starts on a Sunday.
  const firstDow = new Date(data[0].date + 'T00:00:00').getDay()
  const cells: ({ date: string; count: number } | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...data,
  ]

  // Split into week columns of 7.
  const weeks: (typeof cells)[] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  function level(count: number): string {
    if (count === 0) return 'bg-muted'
    const r = count / max
    if (r > 0.66) return 'bg-cta'
    if (r > 0.33) return 'bg-cta/70'
    return 'bg-cta/40'
  }

  const total = data.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="border-border bg-card rounded-2xl border p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading font-semibold">Review activity</h2>
        <span className="text-muted-foreground text-xs">
          {total} in the last {Math.round(data.length / 7)} weeks
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((cell, di) =>
                cell ? (
                  <span
                    key={cell.date}
                    className={cn('size-3 rounded-[3px]', level(cell.count))}
                    title={`${cell.date}: ${cell.count} review${cell.count === 1 ? '' : 's'}`}
                  />
                ) : (
                  <span key={`pad-${wi}-${di}`} className="size-3" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="text-muted-foreground mt-3 flex items-center justify-end gap-1 text-[10px]">
        Less
        <span className="bg-muted size-3 rounded-[3px]" />
        <span className="bg-cta/40 size-3 rounded-[3px]" />
        <span className="bg-cta/70 size-3 rounded-[3px]" />
        <span className="bg-cta size-3 rounded-[3px]" />
        More
      </div>
    </div>
  )
}
