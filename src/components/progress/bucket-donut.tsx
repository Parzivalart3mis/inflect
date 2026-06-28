'use client'

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

import type { BucketCounts } from '@/types/dto'

const SEGMENTS: {
  key: keyof BucketCounts
  label: string
  color: string
}[] = [
  { key: 'new', label: 'New', color: 'var(--chart-1)' },
  { key: 'learning', label: 'Learning', color: 'var(--chart-2)' },
  { key: 'review', label: 'Review', color: 'var(--chart-3)' },
  { key: 'mastered', label: 'Mastered', color: 'var(--chart-4)' },
]

export function BucketDonut({
  buckets,
  total,
}: {
  buckets: BucketCounts
  total: number
}) {
  const data = SEGMENTS.map((s) => ({
    name: s.label,
    value: buckets[s.key],
    color: s.color,
  })).filter((d) => d.value > 0)

  return (
    <div className="border-border bg-card rounded-2xl border p-5">
      <h2 className="font-heading mb-3 font-semibold">Card breakdown</h2>
      <div className="flex items-center gap-4">
        <div className="relative size-32 shrink-0">
          {total > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  innerRadius={42}
                  outerRadius={62}
                  paddingAngle={2}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="border-muted absolute inset-2 rounded-full border-8" />
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-2xl font-bold">{total}</span>
            <span className="text-muted-foreground text-[11px]">cards</span>
          </div>
        </div>

        <ul className="flex-1 space-y-1.5">
          {SEGMENTS.map((s) => (
            <li key={s.key} className="flex items-center gap-2 text-sm">
              <span
                className="size-3 rounded-full"
                style={{ background: s.color }}
                aria-hidden
              />
              <span className="flex-1">{s.label}</span>
              <span className="text-muted-foreground font-medium">
                {buckets[s.key]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
