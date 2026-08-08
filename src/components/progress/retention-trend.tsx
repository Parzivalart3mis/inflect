'use client'

import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Point = { week: string; rate: number | null; reviews: number }

/** Weekly retention (% of reviews rated good/easy) over the last 12 weeks. */
export function RetentionTrend({ data }: { data: Point[] }) {
  const scored = data.filter((d) => d.rate !== null)
  if (scored.length === 0) return null

  const totalReviews = data.reduce((sum, d) => sum + d.reviews, 0)
  // Reviews-weighted average across the window.
  const weightedGood = data.reduce(
    (sum, d) => sum + (d.rate ?? 0) * d.reviews,
    0,
  )
  const avg = totalReviews > 0 ? Math.round(weightedGood / totalReviews) : 0

  return (
    <div className="border-border bg-card rounded-2xl border p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-heading font-semibold">Retention</h2>
        <span className="text-muted-foreground text-xs">
          {avg}% avg · last {data.length} weeks
        </span>
      </div>
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 6, right: 4, left: 0, bottom: 0 }}
          >
            <ReferenceLine
              y={avg}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="week"
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
              tickFormatter={(d: string) => d.slice(5)}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            />
            <YAxis
              domain={[0, 100]}
              width={30}
              tickLine={false}
              axisLine={false}
              ticks={[0, 50, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            />
            <Tooltip
              cursor={{ stroke: 'var(--muted)', strokeWidth: 1 }}
              contentStyle={{
                background: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--popover-foreground)',
              }}
              labelFormatter={(d) => `Week of ${d}`}
              formatter={(value, _name, item) => [
                value === null
                  ? 'no reviews'
                  : `${value}% · ${item?.payload?.reviews ?? 0} reviews`,
                'retention',
              ]}
            />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="var(--chart-1)"
              strokeWidth={2}
              connectNulls
              dot={{ r: 2.5, fill: 'var(--chart-1)', strokeWidth: 0 }}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
