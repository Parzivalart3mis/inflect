'use client'

import { computeNextState, initialState, type Rating, type SRSState } from '@/lib/srs/sm2'
import type { SrsDTO } from '@/types/dto'
import { cn } from '@/lib/utils'

const BUTTONS: {
  rating: Rating
  label: string
  className: string
}[] = [
  {
    rating: 'again',
    label: 'Again',
    className: 'bg-[#C0392B] text-white hover:bg-[#a93226]',
  },
  {
    rating: 'hard',
    label: 'Hard',
    className: 'bg-[#E8B84B] text-[#2D1A0A] hover:bg-[#e0ad34]',
  },
  {
    rating: 'good',
    label: 'Good',
    className: 'bg-[#7C4A1E] text-[#FDF8F2] hover:bg-[#6a3f19]',
  },
  {
    rating: 'easy',
    label: 'Easy',
    className: 'bg-[#2E7D4F] text-white hover:bg-[#276b44]',
  },
]

function stateFrom(srs: SrsDTO | null | undefined): SRSState {
  if (!srs) return initialState()
  return {
    interval: srs.interval,
    repetitions: srs.repetitions,
    easeFactor: srs.easeFactor,
    dueDate: new Date(srs.dueDate),
    bucket: srs.bucket,
  }
}

/** Human interval label from a day count (1d, 3w, 5mo, 2y). */
function formatInterval(days: number): string {
  if (days < 7) return `${days}d`
  if (days < 30) return `${Math.round(days / 7)}w`
  if (days < 365) return `${Math.round(days / 30)}mo`
  return `${Math.round(days / 365)}y`
}

export function SRSButtons({
  onRate,
  disabled,
  srs,
}: {
  onRate: (rating: Rating) => void
  disabled?: boolean
  /** The card's current SRS state, used to preview each rating's next interval. */
  srs?: SrsDTO | null
}) {
  const state = stateFrom(srs)

  return (
    <div className="grid grid-cols-4 gap-2">
      {BUTTONS.map((b) => {
        const next = computeNextState(state, b.rating)
        return (
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
            <span className="text-[10px] font-normal opacity-75">
              {formatInterval(next.interval)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
