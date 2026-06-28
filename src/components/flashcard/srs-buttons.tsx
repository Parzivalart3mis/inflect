'use client'

import type { Rating } from '@/lib/srs/sm2'
import { cn } from '@/lib/utils'

const BUTTONS: {
  rating: Rating
  label: string
  hint: string
  className: string
}[] = [
  {
    rating: 'again',
    label: 'Again',
    hint: '1',
    className: 'bg-[#C0392B] text-white hover:bg-[#a93226]',
  },
  {
    rating: 'hard',
    label: 'Hard',
    hint: '2',
    className: 'bg-[#E8B84B] text-[#2D1A0A] hover:bg-[#e0ad34]',
  },
  {
    rating: 'good',
    label: 'Good',
    hint: '3',
    className: 'bg-[#7C4A1E] text-[#FDF8F2] hover:bg-[#6a3f19]',
  },
  {
    rating: 'easy',
    label: 'Easy',
    hint: '4',
    className: 'bg-[#2E7D4F] text-white hover:bg-[#276b44]',
  },
]

export function SRSButtons({
  onRate,
  disabled,
}: {
  onRate: (rating: Rating) => void
  disabled?: boolean
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {BUTTONS.map((b) => (
        <button
          key={b.rating}
          type="button"
          disabled={disabled}
          onClick={() => onRate(b.rating)}
          className={cn(
            'flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-sm font-semibold shadow-sm transition-transform active:scale-95 disabled:opacity-50',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
            b.className,
          )}
        >
          {b.label}
          <span className="hidden text-[10px] font-normal opacity-70 sm:block">
            {b.hint}
          </span>
        </button>
      ))}
    </div>
  )
}
