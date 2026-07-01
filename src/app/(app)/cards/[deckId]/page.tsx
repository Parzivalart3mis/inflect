'use client'

import {
  ChevronLeft,
  Download,
  Layers,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Fab } from '@/components/common/fab'
import { ListSkeleton } from '@/components/common/list-skeleton'
import { BulkImportDialog } from '@/components/flashcard/bulk-import-dialog'
import { DeckCardTile } from '@/components/flashcard/deck-card-tile'
import { CreateCardDialog } from '@/components/flashcard/create-card-dialog'
import { EditDeckDialog } from '@/components/flashcard/edit-deck-dialog'
import { useLanguage } from '@/components/providers/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { mutateJson } from '@/lib/fetcher'
import type { CardDTO, DeckDTO } from '@/types/dto'

export default function DeckDetailPage() {
  const router = useRouter()
  const { deckId } = useParams<{ deckId: string }>()
  const { activeLanguage } = useLanguage()
  const localeCode = activeLanguage?.localeCode ?? 'en-US'

  const { data, error, isLoading, mutate } = useSWR<{
    deck: DeckDTO
    cards: CardDTO[]
  }>(deckId ? `/api/decks/${deckId}/cards` : null)

  const [addOpen, setAddOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [query, setQuery] = useState('')

  const cards = data?.cards ?? []
  const dueCount = cards.filter(
    (c) => c.isPinned || !c.srs || new Date(c.srs.dueDate) <= new Date(),
  ).length

  const isVocab = data?.deck.kind === 'vocab'
  const q = query.trim().toLowerCase()
  // Vocab decks are searchable by the English front word.
  const filteredCards =
    isVocab && q
      ? cards.filter((c) => c.front.toLowerCase().includes(q))
      : cards

  async function deleteDeck() {
    if (!data) return
    try {
      await mutateJson(`/api/decks/${deckId}`, 'DELETE')
      toast.success('Deck deleted')
      router.push('/cards')
    } catch {
      toast.error('Could not delete deck')
    }
  }

  return (
    <div>
      <div className="sticky top-14 -mx-4 flex items-center justify-between gap-2 bg-background/90 px-4 py-2 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          render={<Link href="/cards" />}
        >
          <ChevronLeft className="size-4" />
          Decks
        </Button>
        {data && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Deck actions" />
              }
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Edit deck
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkOpen(true)}>
                <Upload className="size-4" />
                Bulk import
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<a href={`/api/decks/${deckId}/export`} download />}
              >
                <Download className="size-4" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={deleteDeck}>
                <Trash2 className="size-4" />
                Delete deck
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isLoading && (
        <div className="pt-4">
          <ListSkeleton rows={4} />
        </div>
      )}

      {error && (
        <div className="pt-6">
          <ErrorState message="Couldn't load this deck." onRetry={() => mutate()} />
        </div>
      )}

      {data && (
        <>
          <div className="pt-4 pb-3">
            <h1 className="font-heading flex items-center gap-2 text-2xl font-semibold tracking-tight">
              {data.deck.name}
              {data.deck.kind === 'vocab' && (
                <span className="bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 text-[11px] font-medium">
                  Vocab
                </span>
              )}
            </h1>
            {data.deck.description && (
              <p className="text-muted-foreground mt-0.5 text-sm">
                {data.deck.description}
              </p>
            )}
            <p className="text-muted-foreground mt-1 text-xs">
              {cards.length} card{cards.length === 1 ? '' : 's'}
              {dueCount > 0 && ` · ${dueCount} due`}
            </p>
          </div>

          {dueCount > 0 && (
            <Button
              className="bg-cta text-cta-foreground hover:bg-cta/90 mb-4 w-full"
              size="lg"
              onClick={() => router.push(`/cards/${deckId}/review`)}
            >
              <Play className="size-4" />
              Start Review · {dueCount}
            </Button>
          )}

          {cards.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No cards yet"
              description="Add a flashcard with a rule on the front and an optional exception on the back."
              action={
                <div className="flex gap-2">
                  <Button
                    className="bg-cta text-cta-foreground hover:bg-cta/90"
                    onClick={() => setAddOpen(true)}
                  >
                    <Plus className="size-4" />
                    Add card
                  </Button>
                  <Button variant="outline" onClick={() => setBulkOpen(true)}>
                    <Upload className="size-4" />
                    Bulk import
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              {isVocab && (
                <div className="relative mb-4">
                  <Search
                    className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                    aria-hidden
                  />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search English words…"
                    className="pl-9"
                    aria-label="Search cards"
                  />
                </div>
              )}

              {filteredCards.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center text-sm">
                  No cards match “{query.trim()}”.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {filteredCards.map((card) => (
                    <li key={card.id}>
                      <DeckCardTile
                        card={card}
                        localeCode={localeCode}
                        onChanged={() => mutate()}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}

      <Fab onClick={() => setAddOpen(true)} label="Add card" disabled={!data} />

      {activeLanguage && (
        <CreateCardDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          languageId={activeLanguage.id}
          defaultDeckId={deckId}
          onCreated={() => mutate()}
        />
      )}
      <BulkImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        deckId={deckId}
        onImported={() => mutate()}
      />
      {data && (
        <EditDeckDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          deck={data.deck}
          onSaved={() => mutate()}
        />
      )}
    </div>
  )
}
