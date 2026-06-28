import Link from 'next/link'

import type { DeckDTO } from '@/types/dto'
import { cn } from '@/lib/utils'

const BUCKET_META: { key: keyof DeckDTO['buckets']; label: string; className: string }[] = [
  { key: 'new', label: 'New', className: 'bg-chart-1' },
  { key: 'learning', label: 'Learning', className: 'bg-chart-2' },
  { key: 'review', label: 'Review', className: 'bg-chart-3' },
  { key: 'mastered', label: 'Mastered', className: 'bg-chart-4' },
]

export function DeckCard({ deck }: { deck: DeckDTO }) {
  const total = deck.cardCount || 1

  return (
    <Link
      href={`/cards/${deck.id}`}
      className="border-border bg-card hover:border-primary/40 block rounded-xl border p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading text-foreground line-clamp-1 font-semibold">
            {deck.name}
          </h3>
          {deck.description && (
            <p className="text-muted-foreground mt-0.5 line-clamp-1 text-sm">
              {deck.description}
            </p>
          )}
        </div>
        {deck.dueToday > 0 && (
          <span className="bg-cta text-cta-foreground inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
            {deck.dueToday} due
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-muted-foreground text-xs">
          {deck.cardCount} card{deck.cardCount === 1 ? '' : 's'}
        </span>
        {deck.cardCount > 0 && (
          <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            {BUCKET_META.map(({ key, className }) =>
              deck.buckets[key] > 0 ? (
                <div
                  key={key}
                  className={cn('h-full', className)}
                  style={{ width: `${(deck.buckets[key] / total) * 100}%` }}
                />
              ) : null,
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
