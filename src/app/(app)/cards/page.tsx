'use client'

import { Layers, Play, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
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
import { cn } from '@/lib/utils'
import type { DeckDTO, DeckKind } from '@/types/dto'

const KINDS: DeckKind[] = ['grammar', 'vocab']
const STORAGE_KEY = 'inflect:deckKind'

export default function CardsPage() {
  const router = useRouter()
  const { activeLanguageId, activeLanguage } = useLanguage()
  const [createOpen, setCreateOpen] = useState(false)
  const [kind, setKind] = useState<DeckKind>('grammar')

  // Restore the last-used tab.
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'grammar' || saved === 'vocab') setKind(saved)
  }, [])

  function selectKind(k: DeckKind) {
    setKind(k)
    localStorage.setItem(STORAGE_KEY, k)
  }

  const key = activeLanguageId ? `/api/decks?languageId=${activeLanguageId}` : null
  const { data: decks, error, isLoading, mutate } = useSWR<DeckDTO[]>(key)

  const totalDue = decks?.reduce((sum, d) => sum + d.dueToday, 0) ?? 0
  const visibleDecks = decks?.filter((d) => d.kind === kind) ?? []
  const hasAnyDecks = !!decks && decks.length > 0

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

      {hasAnyDecks && (
        <div className="bg-muted mb-4 inline-flex rounded-full p-1">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => selectKind(k)}
              aria-pressed={kind === k}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors',
                kind === k
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {k}
            </button>
          ))}
        </div>
      )}

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

      {hasAnyDecks && visibleDecks.length === 0 && (
        <EmptyState
          icon={Layers}
          title={`No ${kind} decks yet`}
          description={
            kind === 'vocab'
              ? 'Vocab decks hold words with their pronunciation. Create one to get started.'
              : 'Grammar decks hold rules with optional exceptions. Create one to get started.'
          }
          action={
            <Button
              className="bg-cta text-cta-foreground hover:bg-cta/90"
              onClick={() => setCreateOpen(true)}
              disabled={!activeLanguageId}
            >
              <Plus className="size-4" />
              New {kind} deck
            </Button>
          }
        />
      )}

      {visibleDecks.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visibleDecks.map((deck) => (
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
          defaultKind={kind}
          onCreated={(deckId) => router.push(`/cards/${deckId}`)}
        />
      )}
    </div>
  )
}
