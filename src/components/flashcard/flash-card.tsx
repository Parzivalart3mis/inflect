'use client'

import { motion } from 'framer-motion'
import { Loader2, Volume2 } from 'lucide-react'
import { useState } from 'react'

import { isTTSAvailable, resolveUtterance, speak } from '@/lib/tts/speak'
import { cn } from '@/lib/utils'

interface Props {
  front: string
  back?: string | null
  localeCode: string
  /** Controlled flip state (review session). Omit for self-managed flip. */
  flipped?: boolean
  onFlipChange?: (flipped: boolean) => void
  className?: string
}

export function FlashCard({
  front,
  back,
  localeCode,
  flipped: controlledFlipped,
  onFlipChange,
  className,
}: Props) {
  const [internalFlipped, setInternalFlipped] = useState(false)
  const [speaking, setSpeaking] = useState<'back' | null>(null)
  const flipped = controlledFlipped ?? internalFlipped
  const showBackSpeaker = isTTSAvailable() && !!back

  function toggle() {
    if (onFlipChange) onFlipChange(!flipped)
    else setInternalFlipped((f) => !f)
  }

  async function playBack(e: React.MouseEvent) {
    e.stopPropagation()
    const utt = resolveUtterance('back', {
      front,
      back: back ?? null,
      isVocab: true,
      localeCode,
    })
    if (!utt) return
    setSpeaking('back')
    try {
      await speak(utt.text, utt.locale)
    } finally {
      setSpeaking(null)
    }
  }

  return (
    <div
      className={cn(
        'flashcard relative h-72 w-full cursor-pointer select-none [perspective:1200px]',
        className,
      )}
      onClick={toggle}
      role="button"
      tabIndex={0}
      aria-label={
        flipped
          ? 'Showing pronunciation. Tap to flip back.'
          : 'Showing word. Tap to flip.'
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          toggle()
        }
      }}
    >
      <motion.div
        className="preserve-3d relative h-full w-full"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Front — Word / meaning */}
        <div className="backface-hidden bg-card absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-border p-6 shadow-md">
          <p
            className="flashcard-content text-center text-lg font-medium text-card-foreground"
            dir="auto"
          >
            {front}
          </p>
        </div>

        {/* Back — Pronunciation */}
        <div className="backface-hidden bg-primary absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl p-6 shadow-md [transform:rotateY(180deg)]">
          <span className="text-primary-foreground/60 text-[11px] font-semibold tracking-wide uppercase">
            Pronunciation
          </span>
          <p
            className="flashcard-content text-primary-foreground whitespace-pre-line text-center text-base font-medium"
            dir="auto"
          >
            {back ?? 'No pronunciation added'}
          </p>
          {showBackSpeaker && (
            <button
              onClick={playBack}
              disabled={speaking === 'back'}
              className="mt-1 rounded-full p-2 opacity-60 transition-opacity hover:opacity-100 disabled:opacity-100"
              aria-label="Hear pronunciation"
            >
              {speaking === 'back' ? (
                <Loader2 className="text-cta size-4 animate-spin" />
              ) : (
                <Volume2 className="text-cta size-4" />
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
