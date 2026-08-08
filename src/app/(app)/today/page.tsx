'use client'

import { Layers, type LucideIcon, Mic, NotebookPen, Play, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'

import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { CreateCardDialog } from '@/components/flashcard/create-card-dialog'
import { StreakCounter } from '@/components/progress/streak-counter'
import { useLanguage } from '@/components/providers/language-provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { mutateJson } from '@/lib/fetcher'
import type { ProgressDTO } from '@/types/dto'

export default function TodayPage() {
  const router = useRouter()
  const { activeLanguageId, activeLanguage } = useLanguage()
  const [cardOpen, setCardOpen] = useState(false)
  const [creatingNote, setCreatingNote] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<ProgressDTO>(
    activeLanguageId ? `/api/progress?languageId=${activeLanguageId}` : null,
  )

  async function newNote() {
    if (!activeLanguageId || creatingNote) return
    setCreatingNote(true)
    try {
      const note = await mutateJson<{ id: string }>('/api/notes', 'POST', {
        languageId: activeLanguageId,
        content: '',
      })
      router.push(`/notes/${note.id}`)
    } catch {
      toast.error('Could not create note')
      setCreatingNote(false)
    }
  }

  const due = data?.dueToday ?? 0

  return (
    <div className="pb-24">
      <PageHeader
        title="Today"
        subtitle={activeLanguage ? activeLanguage.name : undefined}
      />

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      )}

      {error && (
        <ErrorState message="Couldn't load your day." onRetry={() => mutate()} />
      )}

      {data && (
        <div className="space-y-4">
          <StreakCounter streak={data.streak} dueToday={data.dueToday} />

          {due > 0 ? (
            <Button
              size="lg"
              className="bg-cta text-cta-foreground hover:bg-cta/90 h-12 w-full text-base"
              onClick={() => router.push('/cards/review')}
            >
              <Play className="size-5" />
              Start review · {due}
            </Button>
          ) : (
            <div className="border-border bg-card rounded-2xl border p-5 text-center">
              <p className="text-sm font-medium">You&apos;re all caught up 🎉</p>
              <p className="text-muted-foreground mt-1 text-sm">
                No cards due right now — add new words or practice with the coach.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon={Plus}
              label="New card"
              onClick={() => setCardOpen(true)}
              disabled={!activeLanguageId}
            />
            <QuickAction
              icon={NotebookPen}
              label="New note"
              onClick={newNote}
              disabled={!activeLanguageId || creatingNote}
            />
            <QuickAction icon={Layers} label="Browse cards" href="/cards" />
            <QuickAction icon={Mic} label="Coach" href="/coach" />
          </div>
        </div>
      )}

      {activeLanguageId && (
        <CreateCardDialog
          open={cardOpen}
          onOpenChange={setCardOpen}
          languageId={activeLanguageId}
          onCreated={() => mutate()}
        />
      )}
    </div>
  )
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
  href,
  disabled,
}: {
  icon: LucideIcon
  label: string
  onClick?: () => void
  href?: string
  disabled?: boolean
}) {
  const className =
    'border-border bg-card hover:border-primary/40 flex items-center gap-3 rounded-xl border p-3 transition-[border-color,transform] active:scale-[0.98] disabled:opacity-50'
  const inner = (
    <>
      <span className="bg-cta/15 text-cta flex size-9 items-center justify-center rounded-xl">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </>
  )
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {inner}
    </button>
  )
}
