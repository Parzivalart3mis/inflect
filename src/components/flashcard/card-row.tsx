'use client'

import {
  Loader2,
  MoreVertical,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  Volume2,
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { EditCardDialog } from '@/components/flashcard/edit-card-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { mutateJson } from '@/lib/fetcher'
import { isTTSAvailable, speak, stripPhonetic } from '@/lib/tts/speak'
import type { CardDTO } from '@/types/dto'

const ENGLISH = 'en-US'

export function CardRow({
  card,
  localeCode,
  onChanged,
}: {
  card: CardDTO
  localeCode: string
  onChanged: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const isVocab = card.deckKind === 'vocab'
  // Vocab → say the target word (back, phonetic stripped) in the deck locale.
  // Grammar → say the English front.
  const speakText = isVocab ? stripPhonetic(card.back ?? '') : card.front
  const speakLocale = isVocab ? localeCode : ENGLISH
  const canSpeak = isTTSAvailable() && speakText.trim().length > 0

  async function playCard() {
    setSpeaking(true)
    try {
      await speak(speakText, speakLocale)
    } finally {
      setSpeaking(false)
    }
  }

  async function togglePin() {
    try {
      await mutateJson(`/api/cards/${card.id}`, 'PATCH', {
        isPinned: !card.isPinned,
      })
      onChanged()
    } catch {
      toast.error('Could not update card')
    }
  }

  async function remove() {
    try {
      await mutateJson(`/api/cards/${card.id}`, 'DELETE')
      toast.success('Card deleted')
      onChanged()
    } catch {
      toast.error('Could not delete card')
    }
  }

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={revealed}
        onClick={() => card.back && setRevealed((r) => !r)}
        onKeyDown={(e) => {
          if (card.back && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setRevealed((r) => !r)
          }
        }}
        className="border-border bg-card hover:border-primary/30 flex items-start gap-3 rounded-xl border p-3 transition-colors"
        style={{ cursor: card.back ? 'pointer' : 'default' }}
      >
        <div className="flex flex-col items-center gap-1.5 pt-0.5">
          {card.hasException && card.deckKind !== 'vocab' ? (
            <span
              className="bg-exception flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              aria-label="Has an exception"
            >
              !
            </span>
          ) : (
            <span className="size-5" aria-hidden />
          )}
          {card.isPinned && (
            <Pin className="text-cta size-3.5 fill-current" aria-label="Pinned" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className="flashcard-content text-foreground text-sm font-medium"
            dir="auto"
          >
            {card.front}
          </p>
          {card.back &&
            (revealed ? (
              <div className="mt-1">
                <span className="text-muted-foreground/70 text-[10px] font-semibold tracking-wide uppercase">
                  {card.deckKind === 'vocab' ? 'Pronunciation' : 'Exception'}
                </span>
                <p
                  className="flashcard-content text-foreground whitespace-pre-line text-sm"
                  dir="auto"
                >
                  {card.back}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground/50 mt-0.5 text-xs italic">
                Tap to reveal
              </p>
            ))}
        </div>

        {/* Controls — stop propagation so they don't flip the card */}
        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
          {canSpeak && (
            <Button
              variant="ghost"
              size="icon"
              className="size-9"
              aria-label="Hear pronunciation"
              disabled={speaking}
              onClick={playCard}
            >
              {speaking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9"
                  aria-label="Card actions"
                />
              }
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={togglePin}>
                {card.isPinned ? (
                  <>
                    <PinOff className="size-4" />
                    Unpin
                  </>
                ) : (
                  <>
                    <Pin className="size-4" />
                    Pin as difficult
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={remove}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <EditCardDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        card={card}
        onSaved={onChanged}
      />
    </>
  )
}
