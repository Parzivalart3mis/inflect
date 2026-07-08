'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import { DeckAutoplay } from '@/components/flashcard/deck-autoplay'
import { useLanguage } from '@/components/providers/language-provider'
import { Button } from '@/components/ui/button'

export default function DeckPracticePage() {
  const { deckId } = useParams<{ deckId: string }>()
  const { activeLanguage } = useLanguage()

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

  return (
    <DeckAutoplay
      deckId={deckId}
      localeCode={activeLanguage.localeCode}
      backHref={`/cards/${deckId}`}
    />
  )
}
