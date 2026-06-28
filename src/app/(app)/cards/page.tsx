'use client'

import { Layers, Play, Plus } from 'lucide-react'
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
import type { DeckDTO } from '@/types/dto'

export default function CardsPage() {
  const router = useRouter()
  const { activeLanguageId, activeLanguage } = useLanguage()
  const [createOpen, setCreateOpen] = useState(false)

  const key = activeLanguageId ? `/api/decks?languageId=${activeLanguageId}` : null
  const { data: decks, error, isLoading, mutate } = useSWR<DeckDTO[]>(key)

  const totalDue = decks?.reduce((sum, d) => sum + d.dueToday, 0) ?? 0

  return (
    <div>
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

      {isLoading && <ListSkeleton rows={3} />}

      {error && (
        <ErrorState message="Couldn't load your decks." onRetry={() => mutate()} />
      )}

      {!isLoading && !error && decks && decks.length === 0 && (
        <EmptyState
          icon={Layers}
          title="Create your first deck"
          description="Decks hold your flashcards by topic. Add one to start building and reviewing cards."
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

      {decks && decks.length > 0 && (
        <ul className="space-y-3">
          {decks.map((deck) => (
            <li key={deck.id}>
              <DeckCard deck={deck} />
            </li>
          ))}
        </ul>
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
