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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { mutateJson } from '@/lib/fetcher'
import type { DeckDTO } from '@/types/dto'

export function EditDeckDialog({
  open,
  onOpenChange,
  deck,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  deck: Pick<DeckDTO, 'id' | 'name' | 'description'>
  onSaved?: () => void
}) {
  const [name, setName] = useState(deck.name)
  const [description, setDescription] = useState(deck.description ?? '')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!name.trim()) {
      toast.error('Give the deck a name')
      return
    }
    setSaving(true)
    try {
      await mutateJson(`/api/decks/${deck.id}`, 'PATCH', {
        name: name.trim(),
        description: description.trim() || null,
      })
      toast.success('Deck updated')
      onSaved?.()
      onOpenChange(false)
    } catch {
      toast.error('Could not update deck')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit deck</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="ed-name">Name</Label>
            <Input
              id="ed-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ed-desc">Description</Label>
            <Textarea
              id="ed-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              maxLength={300}
            />
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
