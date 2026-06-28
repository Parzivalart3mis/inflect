'use client'

import { useHotkeys } from 'react-hotkeys-hook'

import type { Rating } from '@/lib/srs/sm2'

/**
 * Desktop keyboard shortcuts for the review session:
 *   Space — flip the card
 *   1/2/3/4 — Again / Hard / Good / Easy (only once flipped)
 */
export function useReviewHotkeys({
  flipped,
  onFlip,
  onRate,
  enabled = true,
}: {
  flipped: boolean
  onFlip: () => void
  onRate: (rating: Rating) => void
  enabled?: boolean
}) {
  useHotkeys(
    'space',
    (e) => {
      e.preventDefault()
      onFlip()
    },
    { enabled },
    [onFlip, enabled],
  )

  const rate = (r: Rating) => () => {
    if (flipped) onRate(r)
  }

  useHotkeys('1', rate('again'), { enabled: enabled && flipped }, [flipped, onRate])
  useHotkeys('2', rate('hard'), { enabled: enabled && flipped }, [flipped, onRate])
  useHotkeys('3', rate('good'), { enabled: enabled && flipped }, [flipped, onRate])
  useHotkeys('4', rate('easy'), { enabled: enabled && flipped }, [flipped, onRate])
}
