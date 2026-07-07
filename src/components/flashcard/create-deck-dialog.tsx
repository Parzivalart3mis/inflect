'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { mutateJson } from '@/lib/fetcher'

export function CreateDeckDialog({
  open,
  onOpenChange,
  languageId,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  languageId: string
  onCreated?: (deckId: string) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!name.trim()) {
      toast.error('Give the deck a name')
      return
    }
    setSaving(true)
    try {
      const { deckId } = await mutateJson<{ deckId: string }>(
        '/api/decks',
        'POST',
        {
          languageId,
          name: name.trim(),
          description: description.trim() || undefined,
        },
      )
      toast.success('Deck created')
      onCreated?.(deckId)
      onOpenChange(false)
      setName('')
      setDescription('')
    } catch {
      toast.error('Could not create deck')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New deck</DialogTitle>
          <DialogDescription>
            Group related words by topic, e.g. “Food & drink”.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label htmlFor="deck-name">Name</Label>
            <Input
              id="deck-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Food & drink"
              maxLength={100}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deck-desc">Description (optional)</Label>
            <Textarea
              id="deck-desc"
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
            Create deck
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
