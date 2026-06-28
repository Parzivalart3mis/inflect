'use client'

import {
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { CardSuggestionToast } from '@/components/coach/card-suggestion-toast'
import { useLanguage } from '@/components/providers/language-provider'
import { Button } from '@/components/ui/button'
import { useCoachSession } from '@/hooks/use-coach-session'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function CoachSessionPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { activeLanguage } = useLanguage()
  const coach = useCoachSession()

  const [started, setStarted] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [ending, setEnding] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  const goal = params.get('goal') ?? undefined
  const deckIds = params.get('decks')?.split(',').filter(Boolean) ?? undefined

  async function begin() {
    if (!activeLanguage) return
    setStarted(true)
    await coach.start({
      languageId: activeLanguage.id,
      sessionGoal: goal,
      deckIds,
    })
  }

  async function end() {
    setEnding(true)
    stopCamera()
    const id = await coach.stop()
    router.replace(id ? `/coach/${id}` : '/coach')
  }

  // ---- Camera ----
  function stopCamera() {
    if (frameTimerRef.current) clearInterval(frameTimerRef.current)
    frameTimerRef.current = null
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop())
    cameraStreamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  useEffect(() => {
    if (!cameraOn) {
      stopCamera()
      return
    }
    let cancelled = false
    const canvas = document.createElement('canvas')

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        cameraStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play().catch(() => {})
        }
        // Send a frame ~every second.
        frameTimerRef.current = setInterval(() => {
          const video = videoRef.current
          if (!video || video.videoWidth === 0) return
          canvas.width = 320
          canvas.height = (320 * video.videoHeight) / video.videoWidth
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1]
          if (data) coach.sendVideoFrame(data)
        }, 1000)
      })
      .catch(() => setCameraOn(false))

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn])

  useEffect(() => {
    return () => stopCamera()
  }, [])

  // Auto-scroll transcript.
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [coach.transcript])

  if (!activeLanguage) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-muted-foreground">No active language.</p>
        <Button variant="outline" render={<Link href="/coach" />}>
          Back
        </Button>
      </div>
    )
  }

  // ---- Pre-flight ----
  if (!started) {
    return (
      <div className="coach-ui mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <span className="bg-cta/15 text-cta flex size-20 items-center justify-center rounded-full">
          <Mic className="size-10" aria-hidden />
        </span>
        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold">
            Ready to speak {activeLanguage.name}?
          </h1>
          <p className="text-muted-foreground text-balance">
            {goal
              ? `Focus: ${goal}`
              : 'Open practice. Your coach will correct you and weave in your own rules.'}
          </p>
        </div>
        <p className="text-muted-foreground text-xs">
          We’ll ask for microphone access. Speak naturally — tap end when you’re
          done.
        </p>
        <div className="flex w-full flex-col gap-2">
          <Button
            size="lg"
            className="bg-cta text-cta-foreground hover:bg-cta/90 h-12 text-base"
            onClick={begin}
          >
            Start speaking
          </Button>
          <Button variant="ghost" render={<Link href="/coach" />}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  const connecting = coach.status === 'connecting'
  const errored = coach.status === 'error'

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#1C1410] text-[#F0E6D8]">
      {/* Video / avatar area */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn(
            'absolute inset-0 size-full object-cover',
            cameraOn ? 'opacity-100' : 'opacity-0',
          )}
        />

        {!cameraOn && (
          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                'flex size-28 items-center justify-center rounded-full bg-[#E8943A]/20',
                coach.status === 'live' && 'animate-pulse',
              )}
            >
              <Mic className="size-12 text-[#E8943A]" aria-hidden />
            </div>
            <p className="text-sm text-[#F0E6D8]/70">
              {connecting
                ? 'Connecting to your coach…'
                : coach.status === 'live'
                  ? 'Listening — speak naturally'
                  : ''}
            </p>
          </div>
        )}

        {connecting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="size-8 animate-spin text-[#E8943A]" />
          </div>
        )}

        {/* Suggestion toasts */}
        <div className="coach-ui pointer-events-none absolute inset-x-0 top-0 z-20 space-y-2 px-4">
          {coach.suggestions.map((s) => (
            <CardSuggestionToast
              key={s.id}
              suggestion={s}
              languageId={activeLanguage.id}
              sessionId={coach.sessionId}
              onDismiss={() => coach.dismissSuggestion(s.id)}
            />
          ))}
        </div>

        {/* Timer */}
        {coach.status === 'live' && (
          <div className="coach-ui absolute left-1/2 top-0 z-10 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-sm tabular-nums">
            {formatDuration(coach.elapsed)}
          </div>
        )}
      </div>

      {errored && (
        <div className="bg-destructive/20 text-destructive-foreground px-4 py-3 text-center text-sm">
          {coach.error ?? 'Connection lost'} —{' '}
          <Link href="/coach" className="underline">
            go back
          </Link>
        </div>
      )}

      {/* Live transcript */}
      <div className="max-h-40 overflow-y-auto border-t border-white/10 px-4 py-3">
        {coach.transcript.length === 0 ? (
          <p className="text-center text-xs text-[#F0E6D8]/40">
            Transcript will appear here…
          </p>
        ) : (
          <div className="space-y-1.5">
            {coach.transcript.slice(-8).map((entry, i) => (
              <p key={i} className="transcript-text text-sm" dir="auto">
                <span
                  className={cn(
                    'font-semibold',
                    entry.role === 'coach' ? 'text-[#E8943A]' : 'text-[#F0E6D8]',
                  )}
                >
                  {entry.role === 'coach' ? 'Coach' : 'You'}:{' '}
                </span>
                <span className="text-[#F0E6D8]/80">{entry.text}</span>
              </p>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="coach-ui flex items-center justify-center gap-4 border-t border-white/10 px-6 pb-6 pt-4">
        <ControlButton
          active={!coach.micMuted}
          onClick={coach.toggleMute}
          label={coach.micMuted ? 'Unmute' : 'Mute'}
          icon={coach.micMuted ? MicOff : Mic}
        />
        <button
          onClick={end}
          disabled={ending}
          aria-label="End session"
          className="flex size-16 items-center justify-center rounded-full bg-[#C0392B] text-white shadow-lg transition-transform active:scale-95 disabled:opacity-60"
        >
          {ending ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <PhoneOff className="size-7" />
          )}
        </button>
        <ControlButton
          active={cameraOn}
          onClick={() => setCameraOn((v) => !v)}
          label={cameraOn ? 'Camera off' : 'Camera on'}
          icon={cameraOn ? Video : VideoOff}
        />
      </div>
    </div>
  )
}

function ControlButton({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: typeof Mic
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex size-12 items-center justify-center rounded-full transition-colors',
        active
          ? 'bg-white/15 text-[#F0E6D8] hover:bg-white/25'
          : 'bg-white/5 text-[#F0E6D8]/60 hover:bg-white/10',
      )}
    >
      <Icon className="size-5" />
    </button>
  )
}
