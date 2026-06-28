'use client'

import { Lightbulb, Loader2, X } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { mutateJson } from '@/lib/fetcher'
import type { PendingSuggestion } from '@/hooks/use-coach-session'
import type { DeckDTO } from '@/types/dto'

export function CardSuggestionToast({
  suggestion,
  languageId,
  sessionId,
  onDismiss,
}: {
  suggestion: PendingSuggestion
  languageId: string
  sessionId: string | null
  onDismiss: () => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [savingDeck, setSavingDeck] = useState<string | null>(null)
  const { data: decks } = useSWR<DeckDTO[]>(
    pickerOpen ? `/api/decks?languageId=${languageId}` : null,
  )

  async function saveToDeck(deckId: string) {
    if (!sessionId) return
    setSavingDeck(deckId)
    try {
      await mutateJson(`/api/coach/sessions/${sessionId}/cards`, 'POST', {
        deckId,
        front: suggestion.front,
        back: suggestion.back,
      })
      toast.success('Card saved')
      setPickerOpen(false)
      onDismiss()
    } catch {
      toast.error('Could not save card')
    } finally {
      setSavingDeck(null)
    }
  }

  return (
    <>
      <div className="border-border bg-card/95 pointer-events-auto rounded-2xl border p-4 shadow-xl backdrop-blur">
        <div className="flex items-start gap-2">
          <Lightbulb className="text-cta mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Coach suggests a card</p>
            <p className="text-foreground mt-1 line-clamp-2 text-sm" dir="auto">
              <span className="text-muted-foreground">Front: </span>
              {suggestion.front}
            </p>
            {suggestion.back && (
              <p
                className="text-foreground mt-0.5 line-clamp-2 text-sm"
                dir="auto"
              >
                <span className="text-muted-foreground">Back: </span>
                {suggestion.back}
              </p>
            )}
          </div>
          <button
            onClick={onDismiss}
            aria-label="Dismiss suggestion"
            className="text-muted-foreground hover:text-foreground -mr-1 -mt-1 p-1"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
          <Button
            size="sm"
            className="bg-cta text-cta-foreground hover:bg-cta/90"
            onClick={() => setPickerOpen(true)}
          >
            Save to Deck
          </Button>
        </div>
      </div>

      <Sheet open={pickerOpen} onOpenChange={setPickerOpen}>
        <SheetContent side="bottom" className="max-h-[70dvh]">
          <SheetHeader>
            <SheetTitle>Save to which deck?</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 overflow-y-auto px-4 pb-8">
            {!decks && (
              <p className="text-muted-foreground py-4 text-sm">Loading decks…</p>
            )}
            {decks && decks.length === 0 && (
              <p className="text-muted-foreground py-4 text-sm">
                No decks yet. Create one from the Cards tab first.
              </p>
            )}
            {decks?.map((deck) => (
              <button
                key={deck.id}
                disabled={savingDeck !== null}
                onClick={() => saveToDeck(deck.id)}
                className="border-border bg-card hover:bg-accent flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm disabled:opacity-50"
              >
                <span className="font-medium">{deck.name}</span>
                {savingDeck === deck.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <span className="text-muted-foreground text-xs">
                    {deck.cardCount} cards
                  </span>
                )}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
