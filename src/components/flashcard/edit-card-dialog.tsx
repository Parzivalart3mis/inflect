'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { mutateJson } from '@/lib/fetcher'
import type { CardDTO } from '@/types/dto'

export function EditCardDialog({
  open,
  onOpenChange,
  card,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CardDTO
  onSaved?: () => void
}) {
  const [front, setFront] = useState(card.front)
  const [back, setBack] = useState(card.back ?? '')
  const [pinned, setPinned] = useState(card.isPinned)
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!front.trim()) {
      toast.error('A word (front) is required')
      return
    }
    setSaving(true)
    try {
      await mutateJson(`/api/cards/${card.id}`, 'PATCH', {
        front: front.trim(),
        back: back.trim() ? back.trim() : null,
        isPinned: pinned,
      })
      toast.success('Card updated')
      onSaved?.()
      onOpenChange(false)
    } catch {
      toast.error('Could not update card')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit card</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="edit-front">Word (front)</Label>
            <Textarea
              id="edit-front"
              value={front}
              onChange={(e) => setFront(e.target.value)}
              rows={2}
              dir="auto"
              maxLength={1000}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-back">Pronunciation (back)</Label>
            <Textarea
              id="edit-back"
              value={back}
              onChange={(e) => setBack(e.target.value)}
              rows={2}
              dir="auto"
              maxLength={1000}
              placeholder={'hola\n(OH-lah)'}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <div>
              <Label htmlFor="edit-pin">Pin as difficult</Label>
              <p className="text-muted-foreground text-xs">
                Always keep this card in rotation.
              </p>
            </div>
            <Switch id="edit-pin" checked={pinned} onCheckedChange={setPinned} />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
