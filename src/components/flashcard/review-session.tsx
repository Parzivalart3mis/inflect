'use client'

import { CheckCircle2, PartyPopper, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { FlashCard } from '@/components/flashcard/flash-card'
import { SRSButtons } from '@/components/flashcard/srs-buttons'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useReviewHotkeys } from '@/hooks/use-review-hotkeys'
import { mutateJson } from '@/lib/fetcher'
import type { Rating } from '@/lib/srs/sm2'
import type { CardDTO } from '@/types/dto'

export function ReviewSession({
  queueUrl,
  localeCode,
  backHref,
  title,
}: {
  queueUrl: string
  localeCode: string
  backHref: string
  title: string
}) {
  const { data, error, isLoading, mutate } = useSWR<{ cards: CardDTO[] }>(
    queueUrl,
  )

  const [queue, setQueue] = useState<CardDTO[] | null>(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [reviewed, setReviewed] = useState(0)

  useEffect(() => {
    if (data?.cards) {
      setQueue(data.cards)
      setIndex(0)
      setFlipped(false)
      setReviewed(0)
    }
  }, [data])

  const total = queue?.length ?? 0
  const current = queue && index < total ? queue[index] : null
  const completed = queue != null && total > 0 && index >= total

  async function rate(rating: Rating) {
    if (!current || submitting) return
    setSubmitting(true)
    try {
      await mutateJson(`/api/cards/${current.id}/review`, 'POST', { rating })
      setReviewed((n) => n + 1)
      setFlipped(false)
      setIndex((i) => i + 1)
    } catch {
      toast.error('Could not save your rating')
    } finally {
      setSubmitting(false)
    }
  }

  useReviewHotkeys({
    flipped,
    onFlip: () => setFlipped((f) => !f),
    onRate: rate,
    enabled: !!current && !submitting,
  })

  const progress = useMemo(
    () => (total === 0 ? 0 : Math.min(100, (index / total) * 100)),
    [index, total],
  )

  return (
    <div className="coach-ui mx-auto flex min-h-dvh max-w-xl flex-col px-5 pb-8">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 py-3">
        <span className="font-heading font-semibold">{title}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Exit review"
          render={<Link href={backHref} />}
        >
          <X className="size-5" />
        </Button>
      </div>

      {/* Progress */}
      {total > 0 && !completed && (
        <div className="mb-6">
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-cta h-full rounded-full transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-muted-foreground mt-1.5 text-center text-xs">
            {index + 1} of {total}
          </p>
        </div>
      )}

      <div className="flex flex-1 flex-col justify-center">
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[52px] rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {error && (
          <ErrorState
            message="Couldn't load your review queue."
            onRetry={() => mutate()}
          />
        )}

        {!isLoading && !error && total === 0 && (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up"
            description="Nothing is due right now. Come back later or add more cards."
            action={
              <Button variant="outline" render={<Link href={backHref} />}>
                Done
              </Button>
            }
          />
        )}

        {current && !completed && (
          <div className="space-y-6">
            <FlashCard
              front={current.front}
              back={current.back}
              hasException={current.hasException}
              localeCode={localeCode}
              flipped={flipped}
              onFlipChange={setFlipped}
            />

            {flipped ? (
              <SRSButtons onRate={rate} disabled={submitting} />
            ) : (
              <Button
                size="lg"
                className="bg-cta text-cta-foreground hover:bg-cta/90 h-12 w-full text-base"
                onClick={() => setFlipped(true)}
              >
                Show answer
              </Button>
            )}
          </div>
        )}

        {completed && (
          <div className="flex flex-col items-center gap-4 text-center">
            <span className="bg-success/15 text-success flex size-16 items-center justify-center rounded-full">
              <PartyPopper className="size-8" aria-hidden />
            </span>
            <h2 className="font-heading text-2xl font-semibold">
              Review complete
            </h2>
            <p className="text-muted-foreground">
              You reviewed {reviewed} card{reviewed === 1 ? '' : 's'}. Nice work.
            </p>
            <div className="mt-2 flex gap-2">
              <Button variant="outline" render={<Link href={backHref} />}>
                Done
              </Button>
              <Button
                className="bg-cta text-cta-foreground hover:bg-cta/90"
                onClick={() => mutate()}
              >
                Check for more
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
