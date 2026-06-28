'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { mutateJson } from '@/lib/fetcher'
import { LOCALE_OPTIONS } from '@/lib/locales'

const CUSTOM = '__custom__'

export function AddLanguageDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [choice, setChoice] = useState<string>(LOCALE_OPTIONS[0].localeCode)
  const [customName, setCustomName] = useState('')
  const [customLocale, setCustomLocale] = useState('')
  const [customFlag, setCustomFlag] = useState('')
  const [saving, setSaving] = useState(false)

  const isCustom = choice === CUSTOM

  async function submit() {
    let payload: { name: string; localeCode: string; flagEmoji: string }
    if (isCustom) {
      if (!customName.trim() || !/^[a-z]{2}-[A-Z]{2}$/.test(customLocale)) {
        toast.error('Enter a name and a locale like es-ES')
        return
      }
      payload = {
        name: customName.trim(),
        localeCode: customLocale.trim(),
        flagEmoji: customFlag.trim() || '🌐',
      }
    } else {
      const opt = LOCALE_OPTIONS.find((o) => o.localeCode === choice)!
      payload = {
        name: opt.name,
        localeCode: opt.localeCode,
        flagEmoji: opt.flagEmoji,
      }
    }

    setSaving(true)
    try {
      await mutateJson('/api/languages', 'POST', payload)
      toast.success(`${payload.name} added`)
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Could not add language')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a language</DialogTitle>
          <DialogDescription>
            Each language is its own isolated workspace — notes, decks, and
            coach sessions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="lang">Language</Label>
            <Select
              value={choice}
              onValueChange={(v) => v && setChoice(v)}
            >
              <SelectTrigger id="lang" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {LOCALE_OPTIONS.map((o) => (
                  <SelectItem key={o.localeCode} value={o.localeCode}>
                    <span className="mr-2">{o.flagEmoji}</span>
                    {o.name}{' '}
                    <span className="text-muted-foreground">
                      ({o.localeCode})
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM}>Other…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCustom && (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label htmlFor="custom-name">Name</Label>
                <Input
                  id="custom-name"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Catalan"
                  maxLength={60}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="custom-locale">Locale</Label>
                  <Input
                    id="custom-locale"
                    value={customLocale}
                    onChange={(e) => setCustomLocale(e.target.value)}
                    placeholder="ca-ES"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="custom-flag">Flag</Label>
                  <Input
                    id="custom-flag"
                    value={customFlag}
                    onChange={(e) => setCustomFlag(e.target.value)}
                    placeholder="🇪🇸"
                    maxLength={8}
                  />
                </div>
              </div>
            </div>
          )}
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
            Add language
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
