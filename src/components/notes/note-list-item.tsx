'use client'

import { Link2, Pin } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

import { mutateJson } from '@/lib/fetcher'
import type { NoteDTO } from '@/types/dto'
import { cn } from '@/lib/utils'

export function NoteListItem({
  note,
  onChanged,
}: {
  note: NoteDTO
  onChanged?: () => void
}) {
  const pinned = !!note.pinnedAt
  const [busy, setBusy] = useState(false)

  async function togglePin(e: React.MouseEvent) {
    e.preventDefault() // don't follow the stretched link
    e.stopPropagation()
    if (busy) return
    setBusy(true)
    try {
      await mutateJson(`/api/notes/${note.id}`, 'PATCH', { pinned: !pinned })
      onChanged?.()
    } catch {
      toast.error('Could not update note')
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
      <Link
        href={`/notes/${note.id}`}
        aria-label={note.title || 'Untitled'}
        className="absolute inset-0 z-0 rounded-xl"
      />

      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading text-foreground line-clamp-2 text-sm font-semibold">
          {note.title || 'Untitled'}
        </h3>
        <div className="flex shrink-0 items-center gap-1">
          {note.linkedCardCount > 0 && (
            <span
              className="bg-cta/15 text-cta inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              title={`${note.linkedCardCount} linked card${note.linkedCardCount === 1 ? '' : 's'}`}
            >
              <Link2 className="size-3" aria-hidden />
              {note.linkedCardCount}
            </span>
          )}
          <button
            type="button"
            onClick={togglePin}
            disabled={busy}
            aria-pressed={pinned}
            aria-label={pinned ? 'Unpin note' : 'Pin note to top'}
            className="text-muted-foreground hover:text-foreground relative z-10 -m-1 rounded-full p-1 transition-colors"
          >
            <Pin
              className={cn('size-3.5', pinned && 'text-primary fill-current')}
            />
          </button>
        </div>
      </div>

      <p
        className="note-content text-muted-foreground mt-1.5 line-clamp-3 text-xs"
        dir="auto"
      >
        {note.preview || 'Empty note'}
      </p>
    </div>
  )
}
