'use client'

import { UserButton } from '@clerk/nextjs'
import { Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Wordmark } from '@/components/brand/wordmark'
import { LanguageSelector } from '@/components/layout/language-selector'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Button } from '@/components/ui/button'

/** Routes that take over the full screen (no header / bottom nav). */
function isImmersiveRoute(pathname: string): boolean {
  return (
    pathname.includes('/review') ||
    pathname.startsWith('/coach/session')
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (isImmersiveRoute(pathname)) {
    return <div className="app-shell min-h-dvh">{children}</div>
  }

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <header className="border-border bg-background/90 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-2 px-4">
          <Wordmark className="text-xl" />
          <div className="flex items-center gap-1.5">
            <LanguageSelector />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Settings"
              render={<Link href="/settings" />}
            >
              <Settings className="size-5" />
            </Button>
            <UserButton
              appearance={{
                elements: { avatarBox: 'size-8' },
              }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-6">
        {children}
      </main>

      <BottomNav />
    </div>
  )
}
