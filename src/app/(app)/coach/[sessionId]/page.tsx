'use client'

import { ChevronLeft, Clock, Layers, Loader2, Plus, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'

import { ErrorState } from '@/components/common/error-state'
import { TranscriptView } from '@/components/coach/transcript-view'
import { CreateCardDialog } from '@/components/flashcard/create-card-dialog'
import { useLanguage } from '@/components/providers/language-provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { mutateJson } from '@/lib/fetcher'
import { formatMinutes, formatDate } from '@/lib/format'
import type { CoachSessionDTO } from '@/types/dto'

interface Recap {
  summary: string
  cards: { front: string; back: string }[]
}

export default function SessionTranscriptPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { activeLanguageId } = useLanguage()
  const { data, error, isLoading, mutate } = useSWR<CoachSessionDTO>(
    sessionId ? `/api/coach/sessions/${sessionId}` : null,
  )

  const [cardOpen, setCardOpen] = useState(false)
  const [presetFront, setPresetFront] = useState('')
  const [presetBack, setPresetBack] = useState('')
  const [recap, setRecap] = useState<Recap | null>(null)
  const [recapLoading, setRecapLoading] = useState(false)

  function saveSelection(text: string) {
    setPresetFront(text)
    setPresetBack('')
    setCardOpen(true)
  }

  function addRecapCard(card: { front: string; back: string }) {
    setPresetFront(card.front)
    setPresetBack(card.back)
    setCardOpen(true)
  }

  async function generateRecap() {
    if (recapLoading) return
    setRecapLoading(true)
    try {
      const data = await mutateJson<Recap>(
        `/api/coach/sessions/${sessionId}/recap`,
        'POST',
      )
      setRecap(data)
    } catch {
      toast.error('Could not generate a recap')
    } finally {
      setRecapLoading(false)
    }
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

              {/* AI recap */}
              <div className="border-border mt-6 border-t pt-4">
                {!recap ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={generateRecap}
                    disabled={recapLoading}
                  >
                    {recapLoading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    {recapLoading ? 'Reviewing session…' : 'Generate AI recap'}
                  </Button>
                ) : (
                  <div className="space-y-4">
                    {recap.summary && (
                      <div className="border-border bg-card rounded-2xl border p-4">
                        <h2 className="font-heading mb-1.5 flex items-center gap-2 text-sm font-semibold">
                          <Sparkles className="text-cta size-4" />
                          Recap
                        </h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {recap.summary}
                        </p>
                      </div>
                    )}
                    {recap.cards.length > 0 && (
                      <div>
                        <h3 className="text-muted-foreground mb-2 text-xs font-medium">
                          Suggested cards
                        </h3>
                        <ul className="space-y-2">
                          {recap.cards.map((c, i) => (
                            <li
                              key={i}
                              className="border-border bg-card flex items-center gap-2 rounded-lg border px-3 py-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-1 text-sm font-medium" dir="auto">
                                  {c.front}
                                </p>
                                {c.back && (
                                  <p
                                    className="text-muted-foreground line-clamp-1 text-xs"
                                    dir="auto"
                                  >
                                    {c.back}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="shrink-0"
                                onClick={() => addRecapCard(c)}
                                disabled={!activeLanguageId}
                              >
                                <Plus className="size-4" />
                                Add
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {activeLanguageId && (
            <CreateCardDialog
              open={cardOpen}
              onOpenChange={setCardOpen}
              languageId={activeLanguageId}
              presetFront={presetFront}
              presetBack={presetBack}
            />
          )}
        </>
      )}
    </div>
  )
}
