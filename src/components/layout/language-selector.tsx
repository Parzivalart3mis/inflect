'use client'

import { Check, ChevronsUpDown, Loader2, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLanguage } from '@/components/providers/language-provider'
import { cn } from '@/lib/utils'

export function LanguageSelector() {
  const { languages, activeLanguage, setActiveLanguage, switching } =
    useLanguage()
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="border-border bg-card text-foreground hover:bg-accent inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        aria-label="Switch language"
      >
        {switching ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : activeLanguage ? (
          <span className="text-base leading-none" aria-hidden>
            {activeLanguage.flagEmoji}
          </span>
        ) : null}
        <span className="max-w-[8rem] truncate">
          {activeLanguage?.name ?? 'Add language'}
        </span>
        <ChevronsUpDown className="text-muted-foreground size-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Base UI: GroupLabel must live inside a Group. */}
        <DropdownMenuGroup>
          <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
          {languages.length === 0 && (
            <p className="text-muted-foreground px-2 py-1.5 text-xs">
              No languages yet.
            </p>
          )}
          {languages.map((lang) => (
            <DropdownMenuItem
              key={lang.id}
              onClick={() => setActiveLanguage(lang.id)}
              className="gap-2"
            >
              <span className="text-base leading-none" aria-hidden>
                {lang.flagEmoji}
              </span>
              <span className="flex-1 truncate">{lang.name}</span>
              <Check
                className={cn(
                  'size-4',
                  lang.id === activeLanguage?.id ? 'opacity-100' : 'opacity-0',
                )}
              />
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Plus className="size-4" />
          Add or manage languages
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
