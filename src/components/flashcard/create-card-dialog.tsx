'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { mutateJson } from '@/lib/fetcher'
import type { CardDTO, DeckDTO } from '@/types/dto'

const NEW_DECK = '__new_deck__'

export function CreateCardDialog({
  open,
  onOpenChange,
  languageId,
  defaultDeckId,
  sourceNoteId,
  presetFront,
  presetBack,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  languageId: string
  defaultDeckId?: string
  sourceNoteId?: string
  presetFront?: string
  presetBack?: string
  onCreated?: (card: CardDTO) => void
}) {
  const { data: decks, mutate: refreshDecks } = useSWR<DeckDTO[]>(
    open ? `/api/decks?languageId=${languageId}` : null,
  )

  const [deckChoice, setDeckChoice] = useState<string | undefined>(
    defaultDeckId,
  )
  const [newDeckName, setNewDeckName] = useState('')
  const [front, setFront] = useState(presetFront ?? '')
  const [back, setBack] = useState(presetBack ?? '')
  const [saving, setSaving] = useState(false)

  // Default the deck choice once decks load.
  const effectiveChoice =
    deckChoice ?? defaultDeckId ?? decks?.[0]?.id ?? NEW_DECK
  const isNewDeck = effectiveChoice === NEW_DECK || (decks && decks.length === 0)
  const isVocab =
    !isNewDeck && decks?.find((d) => d.id === effectiveChoice)?.kind === 'vocab'

  async function submit() {
    if (!front.trim()) {
      toast.error('A rule (front) is required')
      return
    }
    setSaving(true)
    try {
      let deckId = effectiveChoice
      if (isNewDeck) {
        if (!newDeckName.trim()) {
          toast.error('Name the new deck')
          setSaving(false)
          return
        }
        const deck = await mutateJson<{ deckId: string }>(
          '/api/decks',
          'POST',
          { languageId, name: newDeckName.trim() },
        )
        deckId = deck.deckId
        await refreshDecks()
      }

      const card = await mutateJson<CardDTO>(
        `/api/decks/${deckId}/cards`,
        'POST',
        {
          front: front.trim(),
          back: back.trim() || undefined,
          sourceNoteId,
        },
      )
      toast.success('Card created')
      onCreated?.(card)
      onOpenChange(false)
      // reset
      setFront('')
      setBack('')
      setNewDeckName('')
    } catch {
      toast.error('Could not create card')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New flashcard</DialogTitle>
          <DialogDescription>
            {isVocab ? (
              'The word goes on the front; its pronunciation on the back.'
            ) : (
              <>
                The rule goes on the front; an optional exception on the back
                shows a <span className="text-exception font-semibold">!</span>{' '}
                badge.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="card-deck">Deck</Label>
            <Select
              value={effectiveChoice}
              onValueChange={(v) => v && setDeckChoice(v)}
              // Base UI: SelectValue shows the label (not the raw id) only when
              // Root is given an items map.
              items={{
                ...Object.fromEntries((decks ?? []).map((d) => [d.id, d.name])),
                [NEW_DECK]: '+ New deck…',
              }}
            >
              <SelectTrigger id="card-deck" className="w-full">
                <SelectValue placeholder="Choose a deck" />
              </SelectTrigger>
              <SelectContent>
                {decks?.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
                <SelectItem value={NEW_DECK}>+ New deck…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isNewDeck && (
            <div className="grid gap-2">
              <Label htmlFor="new-deck">New deck name</Label>
              <Input
                id="new-deck"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                placeholder="Verb Conjugation"
                maxLength={100}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="card-front">
              {isVocab ? 'Word (front)' : 'Rule (front)'}
            </Label>
            <Textarea
              id="card-front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              placeholder={
                isVocab ? 'hola' : '“ser” is used for permanent traits'
              }
              rows={2}
              dir="auto"
              maxLength={1000}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="card-back">
              {isVocab
                ? 'Pronunciation (back)'
                : 'Exception (back, optional)'}
            </Label>
            <Textarea
              id="card-back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              placeholder={
                isVocab ? 'OH-lah' : '…except with emotions and conditions'
              }
              rows={2}
              dir="auto"
              maxLength={1000}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving}
            className="bg-cta text-cta-foreground hover:bg-cta/90"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Create card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
