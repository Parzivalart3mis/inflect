'use client'

import Link from 'next/link'
import { Pin } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { mutateJson } from '@/lib/fetcher'
import type { DeckDTO } from '@/types/dto'
import { cn } from '@/lib/utils'

const BUCKET_META: { key: keyof DeckDTO['buckets']; label: string; className: string }[] = [
  { key: 'new', label: 'New', className: 'bg-chart-1' },
  { key: 'learning', label: 'Learning', className: 'bg-chart-2' },
  { key: 'review', label: 'Review', className: 'bg-chart-3' },
  { key: 'mastered', label: 'Mastered', className: 'bg-chart-4' },
]

export function DeckCard({
  deck,
  onChanged,
}: {
  deck: DeckDTO
  onChanged?: () => void
}) {
  const total = deck.cardCount || 1
  const pinned = !!deck.pinnedAt
  const [busy, setBusy] = useState(false)

  async function togglePin(e: React.MouseEvent) {
    e.preventDefault() // don't follow the stretched link
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      await mutateJson(`/api/decks/${deck.id}`, 'PATCH', { pinned: !pinned })
      onChanged?.()
    } catch {
      toast.error('Could not update deck')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={cn(
        'relative flex h-full min-h-32 flex-col rounded-xl border p-3 transition-colors',
        pinned
          ? 'border-primary/40 bg-primary/5'
          : 'border-border bg-card hover:border-primary/40',
      )}
    >
      {/* Stretched link: covers the tile for navigation; the pin button sits
          above it via a higher z-index. */}
      <Link
        href={`/cards/${deck.id}`}
        aria-label={deck.name}
        className="absolute inset-0 z-0 rounded-xl"
      />

      <div className="flex items-start justify-end gap-2">
        <div className="flex items-center gap-1">
          {deck.dueToday > 0 && (
            <span className="bg-cta text-cta-foreground inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold">
              {deck.dueToday} due
            </span>
          )}
          <button
            type="button"
            onClick={togglePin}
            disabled={busy}
            aria-pressed={pinned}
            aria-label={pinned ? 'Unpin deck' : 'Pin deck to top'}
            className="text-muted-foreground hover:text-foreground relative z-10 -m-1 shrink-0 rounded-full p-1 transition-colors"
          >
            <Pin
              className={cn('size-3.5', pinned && 'text-primary fill-current')}
            />
          </button>
        </div>
      </div>

      <h3 className="font-heading text-foreground mt-2 line-clamp-2 text-sm font-semibold">
        {deck.name}
      </h3>
      {deck.description && (
        <p className="text-muted-foreground mt-0.5 line-clamp-1 text-xs">
          {deck.description}
        </p>
      )}

      <div className="mt-auto pt-3">
        <span className="text-muted-foreground text-[11px]">
          {deck.cardCount} card{deck.cardCount === 1 ? '' : 's'}
        </span>
        {deck.cardCount > 0 && (
          <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
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
    </div>
  )
}
