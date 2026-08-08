'use client'

import { useUser } from '@clerk/nextjs'
import { Download, Layers, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { toast } from 'sonner'

import { Wordmark } from '@/components/brand/wordmark'
import { Button } from '@/components/ui/button'
import { fetcher, mutateJson } from '@/lib/fetcher'
import { cn } from '@/lib/utils'
import type { LanguageDTO, SharedDeckDTO } from '@/types/dto'

const PREVIEW_LIMIT = 12

export default function SharedDeckPage() {
  const { token } = useParams<{ token: string }>()
  const { isSignedIn, isLoaded } = useUser()
  const { data, error, isLoading } = useSWR<SharedDeckDTO>(
    token ? `/api/shared/${token}` : null,
    fetcher,
  )

  return (
    <main className="mx-auto min-h-dvh max-w-lg px-5 py-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/">
          <Wordmark className="text-xl" />
        </Link>
        <span className="text-muted-foreground text-xs">Shared deck</span>
      </header>

      {isLoading && (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-20 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Loading deck…
        </div>
      )}

      {error && (
        <div className="border-border bg-card rounded-2xl border p-8 text-center">
          <Layers className="text-muted-foreground mx-auto size-8" />
          <h1 className="font-heading mt-3 text-lg font-semibold">
            This deck isn’t available
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            The link may have been turned off by its owner.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            render={<Link href="/" />}
          >
            Go to Inflect
          </Button>
        </div>
      )}

      {data && (
        <>
          <div className="border-border bg-card rounded-2xl border p-5">
            <div className="flex items-start gap-3">
              <span className="text-3xl" aria-hidden>
                {data.languageFlag || '📚'}
              </span>
              <div className="min-w-0">
                <h1 className="font-heading text-xl font-semibold tracking-tight">
                  {data.name}
                </h1>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {data.languageName ? `${data.languageName} · ` : ''}
                  {data.cardCount} card{data.cardCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            {data.description && (
              <p className="text-muted-foreground mt-3 text-sm">
                {data.description}
              </p>
            )}
          </div>

          <div className="mt-4">
            {!isLoaded ? (
              <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : isSignedIn ? (
              <ImportPanel token={token} />
            ) : (
              <div className="border-border bg-card rounded-2xl border p-4 text-center">
                <p className="text-sm font-medium">
                  Sign in to import this deck
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  It’ll be copied into your account with a fresh study schedule.
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  <Button
                    className="bg-cta text-cta-foreground hover:bg-cta/90"
                    render={
                      <Link
                        href={`/sign-up?redirect_url=${encodeURIComponent(`/shared/${token}`)}`}
                      />
                    }
                  >
                    Create account
                  </Button>
                  <Button
                    variant="outline"
                    render={
                      <Link
                        href={`/sign-in?redirect_url=${encodeURIComponent(`/shared/${token}`)}`}
                      />
                    }
                  >
                    Sign in
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Card preview */}
          <div className="mt-6">
            <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              Preview
            </h2>
            <ul className="divide-border border-border divide-y overflow-hidden rounded-xl border">
              {data.cards.slice(0, PREVIEW_LIMIT).map((c, i) => (
                <li
                  key={i}
                  className="flex items-baseline justify-between gap-3 px-3 py-2.5"
                >
                  <span className="text-sm font-medium" dir="auto">
                    {c.front}
                  </span>
                  {c.back && (
                    <span
                      className="text-muted-foreground shrink-0 text-right text-sm"
                      dir="auto"
                    >
                      {c.back.split('\n')[0]}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {data.cardCount > PREVIEW_LIMIT && (
              <p className="text-muted-foreground mt-2 text-center text-xs">
                and {data.cardCount - PREVIEW_LIMIT} more
              </p>
            )}
          </div>
        </>
      )}
    </main>
  )
}

function ImportPanel({ token }: { token: string }) {
  const router = useRouter()
  const { data: languages, isLoading } = useSWR<LanguageDTO[]>(
    '/api/languages',
    fetcher,
  )
  const [selected, setSelected] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (languages && languages.length > 0 && !selected) {
      setSelected(languages[0].id)
    }
  }, [languages, selected])

  async function doImport() {
    if (!selected || importing) return
    setImporting(true)
    try {
      const { deckId } = await mutateJson<{ deckId: string }>(
        `/api/shared/${token}/import`,
        'POST',
        { languageId: selected },
      )
      toast.success('Deck imported')
      router.push(`/cards/${deckId}`)
    } catch {
      toast.error('Could not import this deck')
      setImporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-6 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading your languages…
      </div>
    )
  }

  if (!languages || languages.length === 0) {
    return (
      <div className="border-border bg-card rounded-2xl border p-4 text-center">
        <p className="text-sm font-medium">Set up a language first</p>
        <p className="text-muted-foreground mt-1 text-xs">
          Create your first language, then come back to import this deck.
        </p>
        <Button
          variant="outline"
          className="mt-3"
          render={<Link href="/today" />}
        >
          Open Inflect
        </Button>
      </div>
    )
  }

  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      {languages.length > 1 && (
        <>
          <p className="text-muted-foreground mb-2 text-xs font-medium">
            Import into
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            {languages.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setSelected(l.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                  selected === l.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <span aria-hidden>{l.flagEmoji}</span>
                {l.name}
              </button>
            ))}
          </div>
        </>
      )}
      <Button
        className="bg-cta text-cta-foreground hover:bg-cta/90 w-full"
        size="lg"
        onClick={doImport}
        disabled={importing || !selected}
      >
        {importing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Import to my account
      </Button>
    </div>
  )
}
