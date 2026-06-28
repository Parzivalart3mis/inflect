'use client'

import { SignOutButton } from '@clerk/nextjs'
import { Check, LogOut, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { AddLanguageDialog } from '@/components/language/add-language-dialog'
import { PageHeader } from '@/components/common/page-header'
import { useLanguage } from '@/components/providers/language-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { mutateJson } from '@/lib/fetcher'
import { cn } from '@/lib/utils'
import type { LanguageDTO } from '@/types/dto'

export default function SettingsPage() {
  const router = useRouter()
  const { languages, activeLanguageId, setActiveLanguage } = useLanguage()
  const [addOpen, setAddOpen] = useState(false)
  const [toDelete, setToDelete] = useState<LanguageDTO | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await mutateJson(`/api/languages/${toDelete.id}`, 'DELETE')
      toast.success(`${toDelete.name} removed`)
      setToDelete(null)
      router.refresh()
    } catch {
      toast.error('Could not delete language')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="pb-6">
      <PageHeader title="Settings" />

      {/* Languages */}
      <section className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading font-semibold">Languages</h2>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        <ul className="space-y-2">
          {languages.map((lang) => (
            <li
              key={lang.id}
              className="border-border bg-card flex items-center gap-3 rounded-xl border p-3"
            >
              <span className="text-xl" aria-hidden>
                {lang.flagEmoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{lang.name}</p>
                <p className="text-muted-foreground text-xs">
                  {lang.deckCount} deck{lang.deckCount === 1 ? '' : 's'} ·{' '}
                  {lang.cardCount} card{lang.cardCount === 1 ? '' : 's'}
                </p>
              </div>
              {lang.id === activeLanguageId ? (
                <span className="text-success flex items-center gap-1 text-xs font-medium">
                  <Check className="size-4" />
                  Active
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveLanguage(lang.id)}
                >
                  Switch
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${lang.name}`}
                onClick={() => setToDelete(lang)}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </section>

      {/* Appearance */}
      <section className="mb-8">
        <h2 className="font-heading mb-2 font-semibold">Appearance</h2>
        <div className="border-border bg-card flex items-center justify-between rounded-xl border p-4">
          <span className="text-sm">Theme</span>
          <ThemeToggle />
        </div>
      </section>

      {/* Account */}
      <section>
        <h2 className="font-heading mb-2 font-semibold">Account</h2>
        <SignOutButton>
          <button
            className={cn(
              'border-border bg-card text-destructive flex w-full items-center gap-2 rounded-xl border p-4 text-sm font-medium',
              'hover:bg-destructive/5 transition-colors',
            )}
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </SignOutButton>
      </section>

      <AddLanguageDialog open={addOpen} onOpenChange={setAddOpen} />

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {toDelete?.name}?</DialogTitle>
            <DialogDescription>
              This permanently removes the workspace and all its decks, cards,
              notes, and coach sessions. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setToDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
