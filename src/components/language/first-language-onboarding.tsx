'use client'

import { Languages } from 'lucide-react'
import { useState } from 'react'

import { Wordmark } from '@/components/brand/wordmark'
import { AddLanguageDialog } from '@/components/language/add-language-dialog'
import { Button } from '@/components/ui/button'

export function FirstLanguageOnboarding() {
  const [open, setOpen] = useState(false)

  return (
    <main className="app-shell flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <Wordmark className="text-3xl" />
      <span className="bg-cta/15 text-cta flex size-16 items-center justify-center rounded-full">
        <Languages className="size-8" aria-hidden />
      </span>
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold">
          Pick your first language
        </h1>
        <p className="text-muted-foreground max-w-sm text-balance">
          Your notebook, flashcards, and AI coach all live inside a language
          workspace. Add one to begin.
        </p>
      </div>
      <Button size="lg" className="bg-cta text-cta-foreground hover:bg-cta/90" onClick={() => setOpen(true)}>
        Add a language
      </Button>
      <AddLanguageDialog open={open} onOpenChange={setOpen} />
    </main>
  )
}
