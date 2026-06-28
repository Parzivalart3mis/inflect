'use client'

import { Plus } from 'lucide-react'

import { cn } from '@/lib/utils'

export function Fab({
  onClick,
  label,
  icon: Icon = Plus,
  disabled,
  className,
}: {
  onClick: () => void
  label: string
  icon?: typeof Plus
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      // Ride above the bottom nav + home indicator (safe-area inset).
      style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      className={cn(
        'bg-cta text-cta-foreground fixed right-5 z-30 flex size-14 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 disabled:opacity-50',
        'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
        className,
      )}
    >
      <Icon className="size-6" strokeWidth={2.4} aria-hidden />
    </button>
  )
}
