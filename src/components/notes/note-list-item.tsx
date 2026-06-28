import { Link2 } from 'lucide-react'
import Link from 'next/link'

import type { NoteDTO } from '@/types/dto'

export function NoteListItem({ note }: { note: NoteDTO }) {
  return (
    <Link
      href={`/notes/${note.id}`}
      className="border-border bg-card hover:border-primary/40 block rounded-xl border p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-heading text-foreground line-clamp-1 font-semibold">
          {note.title || 'Untitled'}
        </h3>
        {note.linkedCardCount > 0 && (
          <span
            className="bg-cta/15 text-cta inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
            title={`${note.linkedCardCount} linked card${note.linkedCardCount === 1 ? '' : 's'}`}
          >
            <Link2 className="size-3" aria-hidden />
            {note.linkedCardCount}
          </span>
        )}
      </div>
      <p className="note-content text-muted-foreground mt-1 line-clamp-2 text-sm" dir="auto">
        {note.preview || 'Empty note'}
      </p>
    </Link>
  )
}
