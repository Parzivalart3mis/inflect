'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TranscriptEntryDTO } from '@/types/dto'

export function TranscriptView({
  transcript,
  onSaveSelection,
}: {
  transcript: TranscriptEntryDTO[]
  onSaveSelection: (text: string) => void
}) {
  const [selection, setSelection] = useState('')

  function captureSelection() {
    const text = window.getSelection()?.toString().trim() ?? ''
    setSelection(text.length >= 2 ? text.slice(0, 1000) : '')
  }

  return (
    <div className="relative">
      <div
        className="space-y-3"
        onMouseUp={captureSelection}
        onTouchEnd={captureSelection}
      >
        {transcript.map((entry, i) => (
          <div
            key={i}
            className={cn(
              'flex',
              entry.role === 'coach' ? 'justify-start' : 'justify-end',
            )}
          >
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                entry.role === 'coach'
                  ? 'bg-card border-border border'
                  : 'bg-primary text-primary-foreground',
              )}
            >
              <p
                className="transcript-text whitespace-pre-wrap break-words"
                dir="auto"
              >
                {entry.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      {selection && (
        <div className="sticky bottom-4 z-10 mt-4 flex justify-center">
          <Button
            className="bg-cta text-cta-foreground hover:bg-cta/90 shadow-lg"
            onClick={() => {
              onSaveSelection(selection)
              setSelection('')
              window.getSelection()?.removeAllRanges()
            }}
          >
            <Plus className="size-4" />
            Save highlight as card
          </Button>
        </div>
      )}
    </div>
  )
}
