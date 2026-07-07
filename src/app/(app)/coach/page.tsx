'use client'

import { ChevronDown, ChevronUp, Clock, Mic, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import useSWR from 'swr'

import { EmptyState } from '@/components/common/empty-state'
import { PageHeader } from '@/components/common/page-header'
import { useLanguage } from '@/components/providers/language-provider'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatMinutes, formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { CoachMode, CoachSessionDTO, DeckDTO } from '@/types/dto'

const DECK_LIMIT = 10

export default function CoachPage() {
  const router = useRouter()
  const { activeLanguage, activeLanguageId } = useLanguage()
  const [goal, setGoal] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [mode, setMode] = useState<CoachMode>('conversation')
  const [showAllDecks, setShowAllDecks] = useState(false)

  const { data: decks } = useSWR<DeckDTO[]>(
    activeLanguageId ? `/api/decks?languageId=${activeLanguageId}` : null,
  )
  const { data: history } = useSWR<{ sessions: CoachSessionDTO[] }>(
    activeLanguageId ? `/api/coach/sessions?languageId=${activeLanguageId}` : null,
  )

  // Alphabetical, so the collapsed first-10 view is stable and predictable
  // rather than raw API order.
  const sortedDecks = useMemo(() => {
    if (!decks) return []
    return [...decks].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    )
  }, [decks])

  const canCollapse = sortedDecks.length > DECK_LIMIT
  // Collapsed: first 10, plus any selected deck that would otherwise be hidden,
  // so an active focus deck is never out of sight.
  const visibleDecks = useMemo(() => {
    if (!canCollapse || showAllDecks) return sortedDecks
    const head = sortedDecks.slice(0, DECK_LIMIT)
    const extraSelected = sortedDecks
      .slice(DECK_LIMIT)
      .filter((d) => selected.includes(d.id))
    return [...head, ...extraSelected]
  }, [sortedDecks, canCollapse, showAllDecks, selected])
  const hiddenCount = sortedDecks.length - visibleDecks.length

  function toggleDeck(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((d) => d !== id)
        : prev.length >= 5
          ? prev
          : [...prev, id],
    )
  }

  function startSession() {
    const params = new URLSearchParams()
    params.set('mode', mode)
    if (goal.trim()) params.set('goal', goal.trim())
    if (selected.length) params.set('decks', selected.join(','))
    router.push(`/coach/session?${params.toString()}`)
  }

  return (
    <div className="pb-4">
      <PageHeader
        title="Coach"
        subtitle={
          activeLanguage
            ? `Speak ${activeLanguage.name} with your AI coach`
            : undefined
        }
      />

      <div className="border-border bg-card space-y-4 rounded-2xl border p-5">
        <div className="flex items-center gap-2">
          <span className="bg-cta/15 text-cta flex size-9 items-center justify-center rounded-full">
            <Sparkles className="size-5" aria-hidden />
          </span>
          <p className="text-sm">
            Powered by every rule and note in{' '}
            <span className="font-medium">{activeLanguage?.name}</span>.
          </p>
        </div>

        <div className="grid gap-2">
          <Label>Mode</Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  value: 'conversation',
                  title: 'Conversation',
                  desc: `Speak only in ${activeLanguage?.name ?? 'the language'}`,
                },
                {
                  value: 'coach',
                  title: 'Coach',
                  desc: 'Learn & ask in English',
                },
              ] as const
            ).map((opt) => {
              const on = mode === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMode(opt.value)}
                  aria-pressed={on}
                  className={cn(
                    'flex flex-col gap-0.5 rounded-xl border p-3 text-left transition-colors',
                    on
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-background hover:bg-accent',
                  )}
                >
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      on ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    {opt.title}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {opt.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="goal">Session goal (optional)</Label>
          <Textarea
            id="goal"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Practice past tense and ordering food"
            rows={2}
            maxLength={500}
          />
        </div>

        {sortedDecks.length > 0 && (
          <div className="grid gap-2">
            <Label>Focus decks (optional, up to 5)</Label>
            <div className="flex flex-wrap gap-2">
              {visibleDecks.map((deck) => {
                const on = selected.includes(deck.id)
                return (
                  <button
                    key={deck.id}
                    type="button"
                    onClick={() => toggleDeck(deck.id)}
                    aria-pressed={on}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      on
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background hover:bg-accent',
                    )}
                  >
                    {deck.name}
                  </button>
                )
              })}
            </div>
            {canCollapse && (
              <button
                type="button"
                onClick={() => setShowAllDecks((v) => !v)}
                aria-expanded={showAllDecks}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 self-start text-xs font-medium transition-colors"
              >
                {showAllDecks ? (
                  <>
                    <ChevronUp className="size-4" aria-hidden />
                    Show fewer decks
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-4" aria-hidden />
                    Show all decks ({hiddenCount} more)
                  </>
                )}
              </button>
            )}
          </div>
        )}

        <Button
          size="lg"
          className="bg-cta text-cta-foreground hover:bg-cta/90 h-12 w-full text-base"
          onClick={startSession}
          disabled={!activeLanguageId}
        >
          <Mic className="size-5" />
          Start Session
        </Button>
      </div>

      {/* History */}
      <h2 className="font-heading mt-7 mb-3 font-semibold">Past sessions</h2>
      {!history?.sessions.length ? (
        <EmptyState
          icon={Mic}
          title="No sessions yet"
          description="Start your first session to practice speaking — you'll get a full transcript afterward."
        />
      ) : (
        <ul className="space-y-2.5">
          {history.sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/coach/${s.id}`}
                className="border-border bg-card hover:border-primary/40 block rounded-xl border p-4 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="bg-secondary text-secondary-foreground shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize">
                      {s.mode}
                    </span>
                    <span className="line-clamp-1 text-sm font-medium">
                      {s.goal || 'Open practice'}
                    </span>
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {formatDate(s.startedAt)}
                  </span>
                </div>
                <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {formatMinutes(s.durationSeconds)}
                  </span>
                  {s.cardsCreated > 0 && (
                    <span>
                      {s.cardsCreated} card{s.cardsCreated === 1 ? '' : 's'} saved
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
