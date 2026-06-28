'use client'

import { ChevronLeft, Clock, Layers } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'

import { ErrorState } from '@/components/common/error-state'
import { TranscriptView } from '@/components/coach/transcript-view'
import { CreateCardDialog } from '@/components/flashcard/create-card-dialog'
import { useLanguage } from '@/components/providers/language-provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatMinutes, formatDate } from '@/lib/format'
import type { CoachSessionDTO } from '@/types/dto'

export default function SessionTranscriptPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { activeLanguageId } = useLanguage()
  const { data, error, isLoading, mutate } = useSWR<CoachSessionDTO>(
    sessionId ? `/api/coach/sessions/${sessionId}` : null,
  )

  const [cardOpen, setCardOpen] = useState(false)
  const [presetFront, setPresetFront] = useState('')

  function saveSelection(text: string) {
    setPresetFront(text)
    setCardOpen(true)
  }

  return (
    <div className="pb-6">
      <div className="sticky top-14 -mx-4 flex items-center bg-background/90 px-4 py-2 backdrop-blur">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          render={<Link href="/coach" />}
        >
          <ChevronLeft className="size-4" />
          Coach
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3 py-4">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-3/4 rounded-2xl" />
        </div>
      )}

      {error && (
        <div className="py-6">
          <ErrorState message="Couldn't load this session." onRetry={() => mutate()} />
        </div>
      )}

      {data && (
        <>
          <div className="pt-4 pb-3">
            <h1 className="font-heading text-xl font-semibold">
              {data.goal || 'Open practice'}
            </h1>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
              <span>{formatDate(data.startedAt)}</span>
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {formatMinutes(data.durationSeconds)}
              </span>
              {data.cardsCreated > 0 && (
                <span className="flex items-center gap-1">
                  <Layers className="size-3" />
                  {data.cardsCreated} card{data.cardsCreated === 1 ? '' : 's'} saved
                </span>
              )}
            </div>
          </div>

          {data.transcript.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              No transcript was captured for this session.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground mb-3 text-xs">
                Highlight any line to save it as a flashcard.
              </p>
              <TranscriptView
                transcript={data.transcript}
                onSaveSelection={saveSelection}
              />
            </>
          )}

          {activeLanguageId && (
            <CreateCardDialog
              open={cardOpen}
              onOpenChange={setCardOpen}
              languageId={activeLanguageId}
              presetFront={presetFront}
            />
          )}
        </>
      )}
    </div>
  )
}
