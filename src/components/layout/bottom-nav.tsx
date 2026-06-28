'use client'

import { BarChart3, Layers, Mic, NotebookPen } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/notes', label: 'Notes', icon: NotebookPen },
  { href: '/cards', label: 'Cards', icon: Layers },
  { href: '/coach', label: 'Coach', icon: Mic },
  { href: '/progress', label: 'Progress', icon: BarChart3 },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="bottom-nav border-border bg-surface-offset/95 sticky bottom-0 z-30 border-t backdrop-blur"
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch justify-around px-2 pt-1.5">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[11px] font-medium transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon
                  className="size-5"
                  strokeWidth={active ? 2.4 : 1.9}
                  aria-hidden
                />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
