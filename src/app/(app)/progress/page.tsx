'use client'

import { BarChart3, Mic, TrendingDown } from 'lucide-react'
import Link from 'next/link'
import useSWR from 'swr'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { BucketDonut } from '@/components/progress/bucket-donut'
import { ReviewBarChart } from '@/components/progress/review-bar-chart'
import { StreakCounter } from '@/components/progress/streak-counter'
import { useLanguage } from '@/components/providers/language-provider'
import { Skeleton } from '@/components/ui/skeleton'
import type { ProgressDTO } from '@/types/dto'

export default function ProgressPage() {
  const { activeLanguageId, activeLanguage } = useLanguage()
  const key = activeLanguageId ? `/api/progress?languageId=${activeLanguageId}` : null
  const { data, error, isLoading, mutate } = useSWR<ProgressDTO>(key)

  return (
    <div className="pb-4">
      <PageHeader
        title="Progress"
        subtitle={activeLanguage ? activeLanguage.name : undefined}
      />

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      )}

      {error && (
        <ErrorState message="Couldn't load your progress." onRetry={() => mutate()} />
      )}

      {data && (
        <div className="space-y-4">
          <StreakCounter streak={data.streak} dueToday={data.dueToday} />

          {data.totalCards === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No stats yet"
              description="Create cards and start reviewing to see your buckets, retention, and review history here."
            />
          ) : (
            <>
              <BucketDonut buckets={data.buckets} total={data.totalCards} />
              <ReviewBarChart data={data.reviewHistory} />

              {/* Weakest decks */}
              <div className="border-border bg-card rounded-2xl border p-5">
                <h2 className="font-heading mb-3 flex items-center gap-2 font-semibold">
                  <TrendingDown className="text-exception size-4" />
                  Weakest decks
                </h2>
                {data.weakestDecks.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Review a few cards to surface where you’re struggling.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {data.weakestDecks.map((d) => (
                      <li key={d.deckId}>
                        <Link
                          href={`/cards/${d.deckId}`}
                          className="hover:bg-accent -mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5"
                        >
                          <span className="flex-1 truncate text-sm font-medium">
                            {d.deckName}
                          </span>
                          <div className="bg-muted h-1.5 w-20 overflow-hidden rounded-full">
                            <div
                              className="bg-exception h-full rounded-full"
                              style={{
                                width: `${Math.round(d.retentionRate * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-muted-foreground w-9 text-right text-xs">
                            {Math.round(d.retentionRate * 100)}%
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* Coach summary */}
          <Link
            href="/coach"
            className="border-border bg-card hover:border-primary/40 flex items-center gap-4 rounded-2xl border p-5 transition-colors"
          >
            <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
              <Mic className="size-6" aria-hidden />
            </span>
            <div className="flex-1">
              <h2 className="font-heading font-semibold">Coach sessions</h2>
              <p className="text-muted-foreground text-sm">
                {data.coachSessions.total === 0
                  ? 'Start your first session to practice speaking'
                  : `${data.coachSessions.total} session${data.coachSessions.total === 1 ? '' : 's'} · ${data.coachSessions.totalMinutes} min`}
              </p>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}
