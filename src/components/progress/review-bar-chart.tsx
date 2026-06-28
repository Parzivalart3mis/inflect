'use client'

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

export function ReviewBarChart({
  data,
}: {
  data: { date: string; reviewed: number }[]
}) {
  const total = data.reduce((sum, d) => sum + d.reviewed, 0)

  return (
    <div className="border-border bg-card rounded-2xl border p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-heading font-semibold">Last 30 days</h2>
        <span className="text-muted-foreground text-xs">
          {total} review{total === 1 ? '' : 's'}
        </span>
      </div>
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              interval={6}
              tickFormatter={(d: string) => d.slice(5)}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
              contentStyle={{
                background: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--popover-foreground)',
              }}
              labelFormatter={(d) => String(d)}
              formatter={(value) => [value as number, 'reviewed']}
            />
            <Bar
              dataKey="reviewed"
              fill="var(--chart-1)"
              radius={[3, 3, 0, 0]}
              maxBarSize={10}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
