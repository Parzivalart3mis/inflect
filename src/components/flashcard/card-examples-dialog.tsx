'use client'

import { Loader2, Sparkles, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FetchError, mutateJson } from '@/lib/fetcher'
import { isTTSAvailable, speak } from '@/lib/tts/speak'
import type { CardDTO } from '@/types/dto'

interface ExamplesData {
  word: string
  partOfSpeech: string
  examples: { target: string; translation: string }[]
  conjugations: { label: string; value: string }[]
}

/**
 * On-demand AI study material for a single card: example sentences (sentence
 * mining) with translations, plus verb conjugations when the word is a verb.
 * Results are generated fresh per open and cached in component state.
 */
export function CardExamplesDialog({
  open,
  onOpenChange,
  card,
  localeCode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CardDTO
  localeCode: string
}) {
  const [data, setData] = useState<ExamplesData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [speaking, setSpeaking] = useState<number | null>(null)
  const loadedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!open) return
    // Only fetch once per card while the dialog stays mounted.
    if (loadedFor.current === card.id && data) return

    let cancelled = false
    setLoading(true)
    setError(null)
    mutateJson<ExamplesData>(`/api/cards/${card.id}/examples`, 'POST')
      .then((res) => {
        if (cancelled) return
        setData(res)
        loadedFor.current = card.id
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof FetchError && err.status === 503
            ? 'AI features are not configured for this app.'
            : 'Could not generate examples. Try again.',
        )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, card.id, data])

  async function retry() {
    setData(null)
    loadedFor.current = null
    setError(null)
    setLoading(true)
    try {
      const res = await mutateJson<ExamplesData>(
        `/api/cards/${card.id}/examples`,
        'POST',
      )
      setData(res)
      loadedFor.current = card.id
    } catch {
      setError('Could not generate examples. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function playSentence(text: string, index: number) {
    setSpeaking(index)
    try {
      await speak(text, localeCode, { awaitEnd: true })
    } finally {
      setSpeaking(null)
    }
  }

  const canSpeak = isTTSAvailable()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="text-cta size-4" />
            Examples &amp; forms
          </DialogTitle>
          <DialogDescription>
            AI-generated example sentences{data?.word ? ` for “${data.word}”` : ''}
            {data?.partOfSpeech ? ` · ${data.partOfSpeech}` : ''}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Generating examples…
          </div>
        )}

        {!loading && error && (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-sm">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={retry}>
              Try again
            </Button>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-5 py-1">
            {data.examples.length > 0 ? (
              <ul className="space-y-3">
                {data.examples.map((ex, i) => (
                  <li
                    key={i}
                    className="border-border bg-card rounded-xl border p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className="text-card-foreground text-sm font-medium"
                        dir="auto"
                      >
                        {ex.target}
                      </p>
                      {canSpeak && (
                        <button
                          type="button"
                          onClick={() => playSentence(ex.target, i)}
                          disabled={speaking !== null}
                          aria-label="Hear sentence"
                          className="text-cta shrink-0 rounded-full p-1 opacity-70 transition-opacity hover:opacity-100 disabled:opacity-100"
                        >
                          {speaking === i ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Volume2 className="size-4" />
                          )}
                        </button>
                      )}
                    </div>
                    {ex.translation && (
                      <p className="text-muted-foreground mt-1 text-sm">
                        {ex.translation}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">
                No examples were generated.
              </p>
            )}

            {data.conjugations.length > 0 && (
              <div>
                <h3 className="font-heading mb-2 text-sm font-semibold">
                  Key forms
                </h3>
                <dl className="divide-border border-border divide-y overflow-hidden rounded-xl border">
                  {data.conjugations.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-baseline justify-between gap-3 px-3 py-2"
                    >
                      <dt className="text-muted-foreground text-xs">
                        {c.label}
                      </dt>
                      <dd
                        className="text-card-foreground text-sm font-medium"
                        dir="auto"
                      >
                        {c.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
