'use client'

import { Pause, Play, RotateCcw, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import useSWR from 'swr'

import { ErrorState } from '@/components/common/error-state'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveUtterance, speak, unlockAudio } from '@/lib/tts/speak'
import type { CardDTO, DeckDTO } from '@/types/dto'

// Timing per card: show the prompt, wait, then speak, then a gap before next.
const WAIT_MS = 3000
const POST_SPEAK_MS = 2500

/**
 * Hands-free practice for one deck: shows a card, waits 3s, speaks its
 * pronunciation, then auto-advances. Audio is unlocked on the Start tap so the
 * timer-driven speech works on iOS.
 */
export function DeckAutoplay({
  deckId,
  localeCode,
  backHref,
}: {
  deckId: string
  localeCode: string
  backHref: string
}) {
  const { data, error, isLoading, mutate } = useSWR<{
    deck: DeckDTO
    cards: CardDTO[]
  }>(deckId ? `/api/decks/${deckId}/cards` : null)

  const cards = data?.cards ?? []
  const [started, setStarted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<'prompt' | 'reveal'>('prompt')

  const total = cards.length
  const current = index < total ? cards[index] : null
  const done = started && index >= total && total > 0

  // Drive one card's cycle whenever the index (or play state) changes.
  useEffect(() => {
    if (!playing || !current) return
    let alive = true
    const timers: ReturnType<typeof setTimeout>[] = []

    setPhase('prompt')
    timers.push(
      setTimeout(async () => {
        if (!alive) return
        setPhase('reveal')
        const utt = resolveUtterance('back', {
          front: current.front,
          back: current.back,
          isVocab: true,
          localeCode,
        })
        if (utt) {
          try {
            await speak(utt.text, utt.locale)
          } catch {
            // ignore playback errors, keep the drill moving
          }
        }
        if (!alive) return
        timers.push(
          setTimeout(() => {
            if (alive) setIndex((i) => i + 1)
          }, POST_SPEAK_MS),
        )
      }, WAIT_MS),
    )

    return () => {
      alive = false
      timers.forEach(clearTimeout)
    }
  }, [index, playing, current, localeCode])

  async function start() {
    await unlockAudio() // within the tap — keeps timer-driven audio working on iOS
    setIndex(0)
    setStarted(true)
    setPlaying(true)
  }

  function restart() {
    setIndex(0)
    setPhase('prompt')
    setPlaying(true)
  }

  const backWord = current ? (current.back ?? '') : ''

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <div className="flex items-center justify-between py-2">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2"
          render={<Link href={backHref} />}
        >
          <X className="size-4" />
          Exit
        </Button>
        {started && total > 0 && !done && (
          <span className="text-muted-foreground text-sm tabular-nums">
            {Math.min(index + 1, total)} / {total}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-1 items-center justify-center">
          <Skeleton className="h-56 w-full max-w-sm rounded-2xl" />
        </div>
      )}

      {error && (
        <div className="pt-6">
          <ErrorState message="Couldn't load this deck." onRetry={() => mutate()} />
        </div>
      )}

      {data && total === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <p className="text-muted-foreground">This deck has no cards yet.</p>
          <Button variant="outline" render={<Link href={backHref} />}>
            Back to deck
          </Button>
        </div>
      )}

      {data && total > 0 && !started && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <div>
            <h1 className="font-heading text-2xl font-semibold">
              {data.deck.name}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {total} card{total === 1 ? '' : 's'} · plays each word after a
              short pause
            </p>
          </div>
          <Button
            size="lg"
            className="bg-cta text-cta-foreground hover:bg-cta/90 h-12 px-8"
            onClick={start}
          >
            <Play className="size-5" />
            Start practice
          </Button>
        </div>
      )}

      {started && current && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="border-border bg-card flex min-h-56 w-full max-w-sm flex-col items-center justify-center gap-4 rounded-2xl border p-6 text-center shadow-md">
            <p
              className="flashcard-content text-card-foreground text-lg font-medium"
              dir="auto"
            >
              {current.front}
            </p>
            {phase === 'reveal' && backWord && (
              <p
                className="flashcard-content text-primary whitespace-pre-line text-base font-semibold"
                dir="auto"
              >
                {backWord}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setPlaying((p) => !p)}
            >
              {playing ? (
                <>
                  <Pause className="size-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="size-5" />
                  Resume
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {done && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <h2 className="font-heading text-xl font-semibold">
            Practice complete
          </h2>
          <div className="flex gap-3">
            <Button variant="outline" render={<Link href={backHref} />}>
              Done
            </Button>
            <Button
              className="bg-cta text-cta-foreground hover:bg-cta/90"
              onClick={restart}
            >
              <RotateCcw className="size-4" />
              Again
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
