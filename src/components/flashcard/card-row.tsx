'use client'

import { MoreVertical, Pencil, Pin, PinOff, Trash2, Volume2 } from 'lucide-react'
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
import { isTTSAvailable, speak } from '@/lib/tts/speak'
import type { CardDTO } from '@/types/dto'

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
    <div className="border-border bg-card flex items-start gap-3 rounded-xl border p-3">
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
        <p className="flashcard-content text-foreground text-sm font-medium" dir="auto">
          {card.front}
        </p>
        {card.back && (
          <p
            className="flashcard-content text-muted-foreground mt-0.5 line-clamp-2 whitespace-pre-line text-sm"
            dir="auto"
          >
            {card.back}
          </p>
        )}
      </div>

      <div className="flex items-center">
        {isTTSAvailable() && (
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label="Hear pronunciation"
            onClick={() => speak(card.front, localeCode)}
          >
            <Volume2 className="size-4" />
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

      <EditCardDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        card={card}
        onSaved={onChanged}
      />
    </div>
  )
}
