'use client'

import { Check, Copy, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { mutateJson } from '@/lib/fetcher'

export function ShareDeckDialog({
  open,
  onOpenChange,
  deckId,
  deckName,
  shareToken,
  onChanged,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  deckName: string
  shareToken: string | null
  onChanged?: () => void
}) {
  const [token, setToken] = useState<string | null>(shareToken)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  // Keep in sync if the parent refetches the deck.
  useEffect(() => setToken(shareToken), [shareToken])

  const shareUrl =
    token && typeof window !== 'undefined'
      ? `${window.location.origin}/shared/${token}`
      : ''

  async function setShared(on: boolean) {
    if (busy) return
    setBusy(true)
    try {
      if (on) {
        const { shareToken: t } = await mutateJson<{ shareToken: string }>(
          `/api/decks/${deckId}/share`,
          'POST',
        )
        setToken(t)
      } else {
        await mutateJson(`/api/decks/${deckId}/share`, 'DELETE')
        setToken(null)
      }
      onChanged?.()
    } catch {
      toast.error('Could not update sharing')
    } finally {
      setBusy(false)
    }
  }

  async function copyLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share “{deckName}”</DialogTitle>
          <DialogDescription>
            Anyone with the link can view this deck and import a copy. They
            won’t see your review progress, and your deck stays untouched.
          </DialogDescription>
        </DialogHeader>

        <div className="border-border flex items-center justify-between rounded-lg border px-3 py-2">
          <div>
            <Label htmlFor="share-toggle">Public link</Label>
            <p className="text-muted-foreground text-xs">
              {token ? 'Sharing is on' : 'Sharing is off'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {busy && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
            <Switch
              id="share-toggle"
              checked={!!token}
              onCheckedChange={setShared}
              disabled={busy}
            />
          </div>
        </div>

        {token && (
          <div className="min-w-0 space-y-2">
            <div className="border-border bg-muted/40 flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2">
              <span className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
                {shareUrl}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={copyLink}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="size-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Turning sharing off makes this link stop working.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
