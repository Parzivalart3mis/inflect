'use client'

import { motion } from 'framer-motion'
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
import { FlashCard } from '@/components/flashcard/flash-card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { mutateJson } from '@/lib/fetcher'
import { isTTSAvailable, speak, stripPhonetic } from '@/lib/tts/speak'
import { cn } from '@/lib/utils'
import type { CardDTO } from '@/types/dto'

const ENGLISH = 'en-US'

export function DeckCardTile({
  card,
  localeCode,
  onChanged,
}: {
  card: CardDTO
  localeCode: string
  onChanged: () => void
}) {
  const [flipped, setFlipped] = useState(false)
  const [speaking, setSpeaking] = useState<'front' | 'back' | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [enlargedOpen, setEnlargedOpen] = useState(false)

  const isVocab = card.deckKind === 'vocab'
  const ttsAvailable = isTTSAvailable()
  const showFrontSpeaker = ttsAvailable && !isVocab
  const showBackSpeaker = ttsAvailable && !!card.back

  async function playFace(face: 'front' | 'back', e: React.MouseEvent) {
    e.stopPropagation()
    const raw = face === 'front' ? card.front : (card.back ?? '')
    if (!raw.trim()) return
    const text = isVocab ? stripPhonetic(raw) : raw
    const locale = isVocab ? localeCode : ENGLISH
    setSpeaking(face)
    try {
      await speak(text, locale)
    } finally {
      setSpeaking(null)
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
      <div className="relative h-44 [perspective:1000px]">
        {/* Static overlay — badges + menu don't rotate with the card */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-2">
          <div className="flex flex-col items-start gap-1">
            {card.hasException && !isVocab && (
              <span
                className="bg-exception flex size-5 items-center justify-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow"
                aria-label="Has an exception"
              >
                !
              </span>
            )}
            {card.isPinned && (
              <Pin
                className="text-cta size-3.5 fill-current drop-shadow"
                aria-label="Pinned"
              />
            )}
          </div>
          <div className="pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    aria-label="Card actions"
                    className="bg-background/70 text-foreground hover:bg-background flex size-7 items-center justify-center rounded-full backdrop-blur transition-colors"
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

        {/* Vocab flips in place; grammar (rules) enlarges into a popup first. */}
        <motion.div
          className="preserve-3d relative h-full w-full cursor-pointer"
          onClick={() =>
            isVocab
              ? card.back && setFlipped((f) => !f)
              : setEnlargedOpen(true)
          }
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          role="button"
          aria-label={
            isVocab
              ? flipped
                ? 'Showing pronunciation'
                : 'Showing word'
              : 'Enlarge card'
          }
        >
          {/* Front */}
          <div className="backface-hidden bg-card border-border absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-7 shadow-sm">
            <p
              className="flashcard-content text-card-foreground line-clamp-4 text-center text-sm font-medium"
              dir="auto"
            >
              {card.front}
            </p>
            {showFrontSpeaker && (
              <SpeakerButton
                loading={speaking === 'front'}
                onClick={(e) => playFace('front', e)}
                className="text-primary"
              />
            )}
            <span className="text-muted-foreground/40 absolute bottom-1.5 text-[10px]">
              {isVocab ? (card.back ? 'tap to flip' : '') : 'tap to open'}
            </span>
          </div>

          {/* Back */}
          <div className="backface-hidden bg-primary absolute inset-0 flex flex-col items-center justify-center gap-1.5 rounded-xl px-3 py-7 shadow-sm [transform:rotateY(180deg)]">
            <span className="text-primary-foreground/60 text-[10px] font-semibold tracking-wide uppercase">
              {isVocab ? 'Pronunciation' : 'Exception'}
            </span>
            <p
              className="flashcard-content text-primary-foreground line-clamp-4 whitespace-pre-line text-center text-sm font-medium"
              dir="auto"
            >
              {card.back}
            </p>
            {showBackSpeaker && (
              <SpeakerButton
                loading={speaking === 'back'}
                onClick={(e) => playFace('back', e)}
                className="text-cta"
              />
            )}
          </div>
        </motion.div>
      </div>

      <EditCardDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        card={card}
        onSaved={onChanged}
      />

      {/* Grammar: enlarged popup; tapping the card inside flips it. */}
      {!isVocab && (
        <Dialog open={enlargedOpen} onOpenChange={setEnlargedOpen}>
          <DialogContent className="max-w-sm">
            <DialogTitle className="sr-only">Flashcard</DialogTitle>
            <FlashCard
              front={card.front}
              back={card.back}
              hasException={card.hasException}
              kind={card.deckKind}
              localeCode={localeCode}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function SpeakerButton({
  loading,
  onClick,
  className,
}: {
  loading: boolean
  onClick: (e: React.MouseEvent) => void
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'rounded-full p-1.5 opacity-60 transition-opacity hover:opacity-100 disabled:opacity-100',
        className,
      )}
      aria-label="Hear pronunciation"
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Volume2 className="size-4" />
      )}
    </button>
  )
}
