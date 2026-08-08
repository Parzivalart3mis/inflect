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
            One card per line — separate the word (front) and its pronunciation
            (back) with a tab or a pipe <code className="font-mono">|</code>. You
            can also paste an Anki export (File → Export → Notes in Plain Text).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-1">
          <Label htmlFor="bulk">Paste cards</Label>
          <Textarea
            id="bulk"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={7}
            dir="auto"
            placeholder={'hello | hola (OH-lah)\nthank you | gracias (GRAH-syahs)\ngoodbye | adiós (ah-DYOHS)'}
            className="font-mono text-sm"
          />
          <p className="text-muted-foreground text-xs">
            {preview.cards.length} card
            {preview.cards.length === 1 ? '' : 's'} ready
            {preview.skipped > 0 &&
              ` · ${preview.skipped} line${preview.skipped === 1 ? '' : 's'} skipped`}
          </p>

          {preview.cards.length > 0 && (
            <div className="border-border max-h-40 overflow-y-auto rounded-lg border">
              <table className="w-full text-xs">
                <tbody>
                  {preview.cards.slice(0, 8).map((c, i) => (
                    <tr key={i} className="border-border/60 border-b last:border-0">
                      <td className="px-2 py-1 font-medium" dir="auto">
                        {c.front}
                      </td>
                      <td className="text-muted-foreground px-2 py-1" dir="auto">
                        {c.back ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.cards.length > 8 && (
                <p className="text-muted-foreground px-2 py-1 text-[11px]">
                  +{preview.cards.length - 8} more…
                </p>
              )}
            </div>
          )}
          <p className="text-muted-foreground text-[11px]">
            Duplicate words already in this deck are skipped automatically.
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
