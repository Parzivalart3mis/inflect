'use client'

import { NotebookPen, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'

import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Fab } from '@/components/common/fab'
import { ListSkeleton } from '@/components/common/list-skeleton'
import { PageHeader } from '@/components/common/page-header'
import { NoteListItem } from '@/components/notes/note-list-item'
import { useLanguage } from '@/components/providers/language-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { mutateJson } from '@/lib/fetcher'
import type { NoteDTO } from '@/types/dto'

export default function NotesPage() {
  const router = useRouter()
  const { activeLanguageId, activeLanguage } = useLanguage()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const debouncedQuery = useDebouncedValue(query, 300)

  const key = activeLanguageId
    ? `/api/notes?languageId=${activeLanguageId}` +
      (debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : '')
    : null

  const { data, error, isLoading, mutate } = useSWR<{
    notes: NoteDTO[]
    hasMore: boolean
  }>(key)

  async function createNote() {
    if (!activeLanguageId) return
    setCreating(true)
    try {
      const note = await mutateJson<{ id: string }>('/api/notes', 'POST', {
        languageId: activeLanguageId,
        content: '',
      })
      router.push(`/notes/${note.id}`)
    } catch {
      toast.error('Could not create note')
      setCreating(false)
    }
  }

  const notes = data?.notes ?? []
  const searching = debouncedQuery.length > 0

  return (
    <div>
      <PageHeader
        title="Notes"
        subtitle={
          activeLanguage ? `Rules & observations in ${activeLanguage.name}` : undefined
        }
      />

      <div className="relative mb-4">
        <Search
          className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all notes…"
          className="pl-9"
          aria-label="Search notes"
          dir="auto"
        />
      </div>

      {isLoading && <ListSkeleton rows={4} />}

      {error && (
        <ErrorState
          message="Couldn't load your notes."
          onRetry={() => mutate()}
        />
      )}

      {!isLoading && !error && notes.length === 0 && (
        <EmptyState
          icon={NotebookPen}
          title={searching ? 'No matches' : 'Start your notebook'}
          description={
            searching
              ? 'No notes match that search. Try different words.'
              : 'Capture grammar rules and observations in your own words. They power your flashcards and your AI coach.'
          }
          action={
            !searching && (
              <Button
                className="bg-cta text-cta-foreground hover:bg-cta/90"
                onClick={createNote}
                disabled={creating}
              >
                Write your first note
              </Button>
            )
          }
        />
      )}

      {notes.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {notes.map((note) => (
            <li key={note.id}>
              <NoteListItem note={note} onChanged={() => mutate()} />
            </li>
          ))}
        </ul>
      )}

      <Fab onClick={createNote} label="New note" disabled={creating} />
    </div>
  )
}
