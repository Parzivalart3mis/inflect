'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

import { ReviewSession } from '@/components/flashcard/review-session'
import { useLanguage } from '@/components/providers/language-provider'
import { Button } from '@/components/ui/button'

/**
 * "Practice difficult" — an ephemeral session over the pinned-as-difficult
 * cards (optionally scoped to a kind, e.g. vocab). It reuses the normal review
 * flow, so ratings still update SRS; it does not create a deck.
 */
export default function PracticePage() {
  const { activeLanguage } = useLanguage()
  const params = useSearchParams()
  const kind = params.get('kind') === 'vocab' ? 'vocab' : undefined

  if (!activeLanguage) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-muted-foreground">No active language.</p>
        <Button variant="outline" render={<Link href="/cards" />}>
          Back to cards
        </Button>
      </div>
    )
  }

  const query = new URLSearchParams({
    languageId: activeLanguage.id,
    pinnedOnly: '1',
  })
  if (kind) query.set('kind', kind)

  return (
    <ReviewSession
      title="Practice difficult"
      queueUrl={`/api/review/queue?${query.toString()}`}
      localeCode={activeLanguage.localeCode}
      backHref="/cards"
    />
  )
}
