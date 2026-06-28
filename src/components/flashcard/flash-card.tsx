'use client'

import { motion } from 'framer-motion'
import { Volume2 } from 'lucide-react'
import { useState } from 'react'

import { isTTSAvailable, speak } from '@/lib/tts/speak'
import { cn } from '@/lib/utils'

interface Props {
  front: string
  back?: string | null
  hasException: boolean
  localeCode: string
  /** Controlled flip state (review session). Omit for self-managed flip. */
  flipped?: boolean
  onFlipChange?: (flipped: boolean) => void
  className?: string
}

export function FlashCard({
  front,
  back,
  hasException,
  localeCode,
  flipped: controlledFlipped,
  onFlipChange,
  className,
}: Props) {
  const [internalFlipped, setInternalFlipped] = useState(false)
  const flipped = controlledFlipped ?? internalFlipped
  const ttsAvailable = isTTSAvailable()

  function toggle() {
    if (onFlipChange) onFlipChange(!flipped)
    else setInternalFlipped((f) => !f)
  }

  function handleSpeak(text: string, e: React.MouseEvent) {
    e.stopPropagation()
    speak(text, localeCode)
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
      aria-label={flipped ? 'Showing exception. Tap to flip back.' : 'Showing rule. Tap to flip.'}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          toggle()
        }
      }}
    >
      {/* Exception badge — indicator only, not a flip trigger */}
      {hasException && (
        <div
          className="bg-exception pointer-events-none absolute right-3 top-3 z-20 flex size-7 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-md"
          aria-label="This card has an exception"
        >
          !
        </div>
      )}

      <motion.div
        className="preserve-3d relative h-full w-full"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Front — Rule */}
        <div className="backface-hidden bg-card absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border border-border p-6 shadow-md">
          <p
            className="flashcard-content text-center text-lg font-medium text-card-foreground"
            dir="auto"
          >
            {front}
          </p>
          {ttsAvailable && (
            <button
              onClick={(e) => handleSpeak(front, e)}
              className="mt-1 rounded-full p-2 opacity-50 transition-opacity hover:opacity-100"
              aria-label="Hear pronunciation"
            >
              <Volume2 className="text-primary size-4" />
            </button>
          )}
        </div>

        {/* Back — Exception */}
        <div
          className="backface-hidden bg-primary absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl p-6 shadow-md [transform:rotateY(180deg)]"
        >
          <p
            className="flashcard-content text-primary-foreground text-center text-base font-medium"
            dir="auto"
          >
            {back ?? 'No exception'}
          </p>
          {back && ttsAvailable && (
            <button
              onClick={(e) => handleSpeak(back, e)}
              className="mt-1 rounded-full p-2 opacity-60 transition-opacity hover:opacity-100"
              aria-label="Hear pronunciation"
            >
              <Volume2 className="text-cta size-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
