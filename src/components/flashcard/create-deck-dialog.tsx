'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { cn } from '@/lib/utils'
import type { DeckKind } from '@/types/dto'

export function CreateDeckDialog({
  open,
  onOpenChange,
  languageId,
  defaultKind = 'grammar',
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  languageId: string
  defaultKind?: DeckKind
  onCreated?: (deckId: string) => void
}) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<DeckKind>(defaultKind)

  // Default the type to the caller's active tab each time the dialog opens.
  useEffect(() => {
    if (open) setKind(defaultKind)
  }, [open, defaultKind])
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
          kind,
        },
      )
      toast.success('Deck created')
      onCreated?.(deckId)
      onOpenChange(false)
      setName('')
      setDescription('')
      setKind('grammar')
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
            Group related cards by topic, e.g. “Ser vs Estar”.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-1">
          <div className="grid gap-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  {
                    value: 'grammar',
                    title: 'Grammar',
                    desc: 'Rule + exception',
                  },
                  {
                    value: 'vocab',
                    title: 'Vocab',
                    desc: 'Word + pronunciation',
                  },
                ] as const
              ).map((opt) => {
                const on = kind === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setKind(opt.value)}
                    aria-pressed={on}
                    className={cn(
                      'flex flex-col gap-0.5 rounded-xl border p-3 text-left transition-colors',
                      on
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-background hover:bg-accent',
                    )}
                  >
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        on ? 'text-primary' : 'text-foreground',
                      )}
                    >
                      {opt.title}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {opt.desc}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deck-name">Name</Label>
            <Input
              id="deck-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Verb Conjugation"
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
