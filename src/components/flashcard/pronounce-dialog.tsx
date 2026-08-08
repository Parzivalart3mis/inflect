'use client'

import { Loader2, Mic, RotateCcw, Square, Volume2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FetchError, mutateJson } from '@/lib/fetcher'
import { isTTSAvailable, speak, stripPhonetic } from '@/lib/tts/speak'
import { cn } from '@/lib/utils'
import type { CardDTO } from '@/types/dto'

interface ScoreResult {
  score: number
  heard: string
  tip: string
  word: string
}

type Phase = 'idle' | 'recording' | 'scoring' | 'result' | 'error'

const MAX_RECORD_MS = 6000
// Ordered so Safari lands on AAC/mp4 (Gemini-friendly) and Chrome on webm/opus.
const MIME_CANDIDATES = [
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
]

function recordingSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  )
}

function pickMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return MIME_CANDIDATES.find((c) => MediaRecorder.isTypeSupported(c))
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const s = String(reader.result)
      resolve(s.slice(s.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-cta'
  if (score >= 50) return 'text-amber-500'
  return 'text-exception'
}

/**
 * Experimental pronunciation practice: record the learner saying a card's word,
 * send the audio to Gemini for a 0-100 score, transcription, and a tip.
 */
export function PronounceDialog({
  open,
  onOpenChange,
  card,
  localeCode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CardDTO
  localeCode: string
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [speaking, setSpeaking] = useState(false)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const word = stripPhonetic(card.back ?? '') || card.front
  const supported = recordingSupported()

  const cleanup = () => {
    if (autoStopRef.current) clearTimeout(autoStopRef.current)
    autoStopRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
  }

  // Reset when closed; stop any live recording.
  useEffect(() => {
    if (!open) {
      cleanup()
      setPhase('idle')
      setResult(null)
      setErrorMsg('')
    }
  }, [open])

  // Stop the mic if the component unmounts mid-recording.
  useEffect(() => cleanup, [])

  async function handleStop() {
    cleanup()
    const type = chunksRef.current[0]?.type || 'audio/webm'
    const blob = new Blob(chunksRef.current, { type })
    if (blob.size === 0) {
      setErrorMsg('No audio was captured. Try again.')
      setPhase('error')
      return
    }
    setPhase('scoring')
    try {
      const audio = await blobToBase64(blob)
      const res = await mutateJson<ScoreResult>(
        `/api/cards/${card.id}/pronounce`,
        'POST',
        { audio, mimeType: blob.type, word },
      )
      setResult(res)
      setPhase('result')
    } catch (err) {
      setErrorMsg(
        err instanceof FetchError && err.status === 503
          ? 'AI features are not configured for this app.'
          : 'Could not score your pronunciation. Try again.',
      )
      setPhase('error')
    }
  }

  async function startRecording() {
    setErrorMsg('')
    setResult(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickMime()
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      )
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => void handleStop()
      recorder.start()
      recorderRef.current = recorder
      setPhase('recording')
      autoStopRef.current = setTimeout(() => stopRecording(), MAX_RECORD_MS)
    } catch {
      setErrorMsg('Microphone access was blocked. Enable it and try again.')
      setPhase('error')
      cleanup()
    }
  }

  function stopRecording() {
    if (autoStopRef.current) clearTimeout(autoStopRef.current)
    autoStopRef.current = null
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  async function hearIt() {
    if (!isTTSAvailable()) return
    setSpeaking(true)
    try {
      await speak(word, localeCode, { awaitEnd: true })
    } finally {
      setSpeaking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="text-cta size-4" />
            Practice pronunciation
            <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
              Beta
            </span>
          </DialogTitle>
          <DialogDescription>
            Say the word out loud and get an AI score with a tip.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-1 py-2 text-center">
          <p
            className="font-heading text-2xl font-semibold"
            dir="auto"
          >
            {word}
          </p>
          {isTTSAvailable() && (
            <button
              type="button"
              onClick={hearIt}
              disabled={speaking || phase === 'recording'}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs disabled:opacity-60"
            >
              {speaking ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Volume2 className="size-3.5" />
              )}
              Hear it
            </button>
          )}
        </div>

        {!supported ? (
          <p className="text-muted-foreground py-6 text-center text-sm">
            Recording isn’t supported on this browser. Try Chrome or Safari.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-4 py-2">
            {(phase === 'idle' || phase === 'error') && (
              <>
                <RecordButton onClick={startRecording} />
                <p className="text-muted-foreground text-xs">
                  {phase === 'error' ? errorMsg : 'Tap to record'}
                </p>
              </>
            )}

            {phase === 'recording' && (
              <>
                <button
                  type="button"
                  onClick={stopRecording}
                  aria-label="Stop recording"
                  className="bg-exception text-white relative flex size-20 items-center justify-center rounded-full"
                >
                  <span className="bg-exception/40 absolute inset-0 animate-ping rounded-full" />
                  <Square className="relative size-7 fill-current" />
                </button>
                <p className="text-muted-foreground text-xs">
                  Recording… tap to stop
                </p>
              </>
            )}

            {phase === 'scoring' && (
              <div className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
                <Loader2 className="size-4 animate-spin" />
                Scoring your pronunciation…
              </div>
            )}

            {phase === 'result' && result && (
              <div className="w-full">
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      'font-heading text-5xl font-bold',
                      scoreColor(result.score),
                    )}
                  >
                    {result.score}
                    <span className="text-muted-foreground text-xl">/100</span>
                  </span>
                </div>
                {result.heard && (
                  <p className="text-muted-foreground mt-3 text-center text-sm">
                    Heard: <span dir="auto">“{result.heard}”</span>
                  </p>
                )}
                {result.tip && (
                  <p className="border-border bg-card mt-3 rounded-xl border p-3 text-sm">
                    {result.tip}
                  </p>
                )}
                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  onClick={startRecording}
                >
                  <RotateCcw className="size-4" />
                  Try again
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RecordButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Start recording"
      className="bg-cta text-cta-foreground hover:bg-cta/90 flex size-20 items-center justify-center rounded-full shadow-sm transition-[transform,background-color] active:scale-95"
    >
      <Mic className="size-8" />
    </button>
  )
}
