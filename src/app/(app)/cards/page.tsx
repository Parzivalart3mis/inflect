'use client'

import { Dumbbell, Layers, Play, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Fab } from '@/components/common/fab'
import { ListSkeleton } from '@/components/common/list-skeleton'
import { PageHeader } from '@/components/common/page-header'
import { CreateDeckDialog } from '@/components/flashcard/create-deck-dialog'
import { DeckCard } from '@/components/flashcard/deck-card'
import { useLanguage } from '@/components/providers/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { DeckDTO } from '@/types/dto'

interface CardHit {
  id: string
  front: string
  back: string | null
  deckId: string
  deckName: string
}

export default function CardsPage() {
  const router = useRouter()
  const { activeLanguageId, activeLanguage } = useLanguage()
  const [createOpen, setCreateOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query.trim(), 300)
  const searching = debouncedQuery.length >= 2

  const key = activeLanguageId ? `/api/decks?languageId=${activeLanguageId}` : null
  const { data: decks, error, isLoading, mutate } = useSWR<DeckDTO[]>(key)

  const searchKey =
    activeLanguageId && searching
      ? `/api/cards/search?languageId=${activeLanguageId}&q=${encodeURIComponent(debouncedQuery)}`
      : null
  const { data: search, isLoading: searchLoading } = useSWR<{ cards: CardHit[] }>(
    searchKey,
  )

  const totalDue = decks?.reduce((sum, d) => sum + d.dueToday, 0) ?? 0
  const pinnedCount = decks?.reduce((sum, d) => sum + d.pinnedCount, 0) ?? 0
  const hasDecks = !!decks && decks.length > 0

  return (
    <div className="pb-24">
      <PageHeader
        title="Cards"
        subtitle={activeLanguage ? `Decks in ${activeLanguage.name}` : undefined}
        action={
          totalDue > 0 && activeLanguageId ? (
            <Button
              className="bg-cta text-cta-foreground hover:bg-cta/90"
              onClick={() => router.push(`/cards/review`)}
            >
              <Play className="size-4" />
              Review {totalDue}
            </Button>
          ) : undefined
        }
      />

      {hasDecks && (
        <div className="relative mb-4">
          <Search
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all cards…"
            className="pl-9"
            aria-label="Search cards"
            dir="auto"
          />
        </div>
      )}

      {/* ---- Search results (across every deck) ---- */}
      {searching ? (
        searchLoading ? (
          <ListSkeleton rows={4} />
        ) : (search?.cards.length ?? 0) === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No cards match “{debouncedQuery}”.
          </p>
        ) : (
          <ul className="space-y-2">
            {search?.cards.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/cards/${c.deckId}`}
                  className="border-border bg-card hover:border-primary/40 block rounded-xl border p-3 transition-[border-color,transform] active:scale-[0.99]"
                >
                  <p className="line-clamp-1 text-sm font-medium" dir="auto">
                    {c.front}
                  </p>
                  {c.back && (
                    <p
                      className="text-muted-foreground mt-0.5 line-clamp-1 text-xs"
                      dir="auto"
                    >
                      {c.back.replace(/\s+/g, ' ')}
                    </p>
                  )}
                  <p className="text-muted-foreground/70 mt-1 text-[11px]">
                    {c.deckName}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        <>
          {pinnedCount > 0 && (
            <Button
              variant="outline"
              className="mb-4 w-full"
              onClick={() => router.push('/cards/practice')}
            >
              <Dumbbell className="size-4" />
              Practice difficult · {pinnedCount}
            </Button>
          )}

          {isLoading && <ListSkeleton variant="grid" rows={6} />}

          {error && (
            <ErrorState
              message="Couldn't load your decks."
              onRetry={() => mutate()}
            />
          )}

          {!isLoading && !error && decks && decks.length === 0 && (
            <EmptyState
              icon={Layers}
              title="Create your first deck"
              description="Decks hold your words with their pronunciation. Add one to start building and reviewing cards."
              action={
                <Button
                  className="bg-cta text-cta-foreground hover:bg-cta/90"
                  onClick={() => setCreateOpen(true)}
                  disabled={!activeLanguageId}
                >
                  <Plus className="size-4" />
                  New deck
                </Button>
              }
            />
          )}

          {hasDecks && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {decks.map((deck) => (
                <li key={deck.id}>
                  <DeckCard deck={deck} onChanged={() => mutate()} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Fab
        onClick={() => setCreateOpen(true)}
        label="New deck"
        disabled={!activeLanguageId}
      />

      {activeLanguageId && (
        <CreateDeckDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          languageId={activeLanguageId}
          onCreated={(deckId) => router.push(`/cards/${deckId}`)}
        />
      )}
    </div>
  )
}
