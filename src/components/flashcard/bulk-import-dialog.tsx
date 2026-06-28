'use client'

import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { parseBulkCards } from '@/lib/cards/bulk-parse'
import { mutateJson } from '@/lib/fetcher'

export function BulkImportDialog({
  open,
  onOpenChange,
  deckId,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  deckId: string
  onImported?: () => void
}) {
  const [raw, setRaw] = useState('')
  const [saving, setSaving] = useState(false)

  const preview = useMemo(() => parseBulkCards(raw), [raw])

  async function submit() {
    if (preview.cards.length === 0) {
      toast.error('Nothing to import yet')
      return
    }
    setSaving(true)
    try {
      const res = await mutateJson<{ created: number; skipped: number }>(
        `/api/decks/${deckId}/cards/bulk`,
        'POST',
        { raw },
      )
      toast.success(
        `Imported ${res.created} card${res.created === 1 ? '' : 's'}` +
          (res.skipped ? ` · ${res.skipped} skipped` : ''),
      )
      onImported?.()
      onOpenChange(false)
      setRaw('')
    } catch {
      toast.error('Import failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk import</DialogTitle>
          <DialogDescription>
            One card per line. Separate the rule and its exception with a tab or
            a pipe <code className="font-mono">|</code>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-1">
          <Label htmlFor="bulk">Paste cards</Label>
          <Textarea
            id="bulk"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={8}
            dir="auto"
            placeholder={'ser = permanent traits | except emotions\nestar = temporary states\nel/la = definite articles'}
            className="font-mono text-sm"
          />
          <p className="text-muted-foreground text-xs">
            {preview.cards.length} card
            {preview.cards.length === 1 ? '' : 's'} ready
            {preview.skipped > 0 && ` · ${preview.skipped} skipped`}
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={saving || preview.cards.length === 0}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Import {preview.cards.length || ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
