'use client'

import { Check, ChevronLeft, Loader2, MoreVertical, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'

import { ErrorState } from '@/components/common/error-state'
import { CreateCardDialog } from '@/components/flashcard/create-card-dialog'
import { useLanguage } from '@/components/providers/language-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { useAutoSave } from '@/hooks/use-auto-save'
import { mutateJson } from '@/lib/fetcher'
import type { CardDTO, NoteDTO } from '@/types/dto'

const SEP = ''

export default function NoteEditorPage() {
  const router = useRouter()
  const { noteId } = useParams<{ noteId: string }>()
  const { activeLanguageId } = useLanguage()

  const { data, error, isLoading, mutate } = useSWR<{
    note: NoteDTO
    cards: CardDTO[]
  }>(noteId ? `/api/notes/${noteId}` : null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [cardOpen, setCardOpen] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    if (data && !initialized.current) {
      initialized.current = true
      setTitle(data.note.title === 'Untitled' ? '' : data.note.title)
      setContent(data.note.content)
      setLoaded(true)
    }
  }, [data])

  const { status } = useAutoSave({
    value: `${title}${SEP}${content}`,
    enabled: loaded,
    delay: 1000,
    onSave: async () => {
      await mutateJson(`/api/notes/${noteId}`, 'PATCH', {
        title: title.trim() || undefined,
        content,
      })
      void mutate()
    },
  })

  async function deleteNote() {
    try {
      await mutateJson(`/api/notes/${noteId}`, 'DELETE')
      toast.success('Note deleted')
      router.push('/notes')
    } catch {
      toast.error('Could not delete note')
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <div className="sticky top-14 -mx-4 flex items-center justify-between gap-2 bg-background/90 px-4 py-2 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          render={<Link href="/notes" />}
        >
          <ChevronLeft className="size-4" />
          Notes
        </Button>
        <div className="flex items-center gap-2">
          <SaveIndicator status={status} />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" aria-label="Note actions" />
              }
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onClick={deleteNote}
              >
                <Trash2 className="size-4" />
                Delete note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-3 py-4">
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      )}

      {error && (
        <div className="py-6">
          <ErrorState message="Couldn't load this note." onRetry={() => mutate()} />
        </div>
      )}

      {loaded && (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled"
            dir="auto"
            maxLength={200}
            className="font-heading mt-3 w-full bg-transparent text-2xl font-semibold outline-none placeholder:text-muted-foreground/50"
            aria-label="Note title"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a grammar rule, an observation, an exception you keep forgetting…"
            dir="auto"
            className="note-content mt-3 w-full flex-1 resize-none bg-transparent text-[16px] leading-relaxed outline-none placeholder:text-muted-foreground/50 field-sizing-content"
            aria-label="Note content"
          />

          <div className="border-border mt-6 border-t pt-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-muted-foreground text-sm font-medium">
                Linked cards{' '}
                {data && data.cards.length > 0 && `(${data.cards.length})`}
              </h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCardOpen(true)}
                disabled={!activeLanguageId}
              >
                <Plus className="size-4" />
                New card from note
              </Button>
            </div>
            {data && data.cards.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No cards yet. Turn a rule from this note into a flashcard.
              </p>
            ) : (
              <ul className="space-y-2">
                {data?.cards.map((card) => (
                  <li
                    key={card.id}
                    className="border-border bg-card flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    {card.hasException && (
                      <span
                        className="bg-exception flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                        aria-label="Has exception"
                      >
                        !
                      </span>
                    )}
                    <span className="line-clamp-1" dir="auto">
                      {card.front}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {activeLanguageId && (
            <CreateCardDialog
              open={cardOpen}
              onOpenChange={setCardOpen}
              languageId={activeLanguageId}
              sourceNoteId={noteId}
              onCreated={() => mutate()}
            />
          )}
        </>
      )}
    </div>
  )
}

function SaveIndicator({ status }: { status: string }) {
  if (status === 'saving')
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <Loader2 className="size-3 animate-spin" /> Saving…
      </span>
    )
  if (status === 'saved')
    return (
      <span className="text-success flex items-center gap-1 text-xs">
        <Check className="size-3" /> Saved
      </span>
    )
  if (status === 'error')
    return <span className="text-destructive text-xs">Save failed</span>
  return null
}
