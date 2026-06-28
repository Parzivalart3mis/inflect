'use client'

import {
  GoogleGenAI,
  Modality,
  type LiveServerMessage,
  type Session,
} from '@google/genai'
import { useCallback, useEffect, useRef, useState } from 'react'

import {
  parseCardSuggestions,
  stripCardSuggestions,
  type SuggestedCard,
} from '@/lib/coach/card-suggestion-parser'
import { MicCapture, PcmPlayer } from '@/lib/coach/audio'
import { mutateJson } from '@/lib/fetcher'
import type { CoachTokenDTO, TranscriptEntryDTO } from '@/types/dto'

export type CoachStatus =
  | 'idle'
  | 'connecting'
  | 'live'
  | 'ending'
  | 'ended'
  | 'error'

export interface PendingSuggestion extends SuggestedCard {
  id: string
}

export interface StartParams {
  languageId: string
  sessionGoal?: string
  deckIds?: string[]
}

export function useCoachSession() {
  const [status, setStatus] = useState<CoachStatus>('idle')
  const [transcript, setTranscript] = useState<TranscriptEntryDTO[]>([])
  const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([])
  const [error, setError] = useState<string | null>(null)
  const [micMuted, setMicMuted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [sessionId, setSessionId] = useState<string | null>(null)

  const sessionRef = useRef<Session | null>(null)
  const micRef = useRef<MicCapture | null>(null)
  const playerRef = useRef<PcmPlayer | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Per-turn transcription buffers.
  const userBuf = useRef('')
  const coachBuf = useRef('')

  const flushBuffers = useCallback(() => {
    const now = new Date().toISOString()
    const entries: TranscriptEntryDTO[] = []
    const userText = userBuf.current.trim()
    const coachText = stripCardSuggestions(coachBuf.current).trim()

    if (userText) entries.push({ role: 'user', text: userText, timestamp: now })

    if (coachBuf.current) {
      const found = parseCardSuggestions(coachBuf.current)
      if (found.length) {
        setSuggestions((prev) => [
          ...prev,
          ...found.map((s) => ({ ...s, id: crypto.randomUUID() })),
        ])
      }
    }
    if (coachText) {
      entries.push({ role: 'coach', text: coachText, timestamp: now })
    }

    if (entries.length) setTranscript((prev) => [...prev, ...entries])
    userBuf.current = ''
    coachBuf.current = ''
  }, [])

  const handleMessage = useCallback(
    (message: LiveServerMessage) => {
      const content = message.serverContent

      // Streamed audio from the model.
      const audio = message.data
      if (audio) playerRef.current?.enqueue(audio)

      if (content?.inputTranscription?.text) {
        userBuf.current += content.inputTranscription.text
      }
      if (content?.outputTranscription?.text) {
        coachBuf.current += content.outputTranscription.text
      }
      if (content?.interrupted) {
        playerRef.current?.clear()
      }
      if (content?.turnComplete) {
        flushBuffers()
      }
    },
    [flushBuffers],
  )

  const stop = useCallback(async (): Promise<string | null> => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null

    micRef.current?.stop()
    playerRef.current?.stop()
    micRef.current = null
    playerRef.current = null

    flushBuffers()

    try {
      sessionRef.current?.close()
    } catch {
      // ignore
    }
    sessionRef.current = null

    const sessionId = sessionIdRef.current
    const durationSeconds = startTimeRef.current
      ? Math.round((Date.now() - startTimeRef.current) / 1000)
      : 0

    setStatus('ending')
    if (sessionId) {
      try {
        // Read latest transcript from state via functional setter.
        let snapshot: TranscriptEntryDTO[] = []
        setTranscript((prev) => {
          snapshot = prev
          return prev
        })
        await mutateJson(`/api/coach/sessions/${sessionId}`, 'PATCH', {
          transcript: snapshot.slice(0, 1000),
          durationSeconds,
        })
      } catch {
        // best-effort save
      }
    }
    setStatus('ended')
    return sessionId
  }, [flushBuffers])

  const start = useCallback(
    async ({ languageId, sessionGoal, deckIds }: StartParams) => {
      setStatus('connecting')
      setError(null)
      setTranscript([])
      setSuggestions([])
      try {
        // 1. Unlock audio first, inside the user gesture that called start().
        const player = new PcmPlayer()
        await player.resume()
        playerRef.current = player

        // 2. Create the session record.
        const { sessionId } = await mutateJson<{ sessionId: string }>(
          '/api/coach/sessions',
          'POST',
          { languageId, goal: sessionGoal },
        )
        sessionIdRef.current = sessionId
        setSessionId(sessionId)

        // 3. Mint an ephemeral token + build the system prompt.
        const token = await mutateJson<CoachTokenDTO>(
          '/api/coach/token',
          'POST',
          { languageId, sessionGoal, deckIds },
        )

        // 4. Connect to Gemini Live with the ephemeral token.
        const ai = new GoogleGenAI({
          apiKey: token.ephemeralToken,
          httpOptions: { apiVersion: 'v1alpha' },
        })

        const session = await ai.live.connect({
          model: token.model,
          callbacks: {
            onopen: () => setStatus('live'),
            onmessage: handleMessage,
            onerror: () => {
              setError('Connection error with the coach.')
              setStatus('error')
            },
            onclose: () => {
              if (sessionRef.current) setStatus('ended')
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: token.systemPrompt,
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        })
        sessionRef.current = session

        // 5. Start streaming the microphone.
        const mic = new MicCapture((base64) => {
          try {
            session.sendRealtimeInput({
              audio: { data: base64, mimeType: 'audio/pcm;rate=16000' },
            })
          } catch {
            // socket may be closing
          }
        })
        await mic.start()
        micRef.current = mic

        startTimeRef.current = Date.now()
        setElapsed(0)
        timerRef.current = setInterval(() => {
          setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000))
        }, 1000)
        setStatus('live')
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not start the session'
        setError(message)
        setStatus('error')
        micRef.current?.stop()
        playerRef.current?.stop()
      }
    },
    [handleMessage],
  )

  const toggleMute = useCallback(() => {
    setMicMuted((prev) => {
      const next = !prev
      micRef.current?.setMuted(next)
      return next
    })
  }, [])

  const sendVideoFrame = useCallback((base64Jpeg: string) => {
    try {
      sessionRef.current?.sendRealtimeInput({
        video: { data: base64Jpeg, mimeType: 'image/jpeg' },
      })
    } catch {
      // ignore
    }
  }, [])

  const dismissSuggestion = useCallback((id: string) => {
    setSuggestions((prev) => prev.filter((s) => s.id !== id))
  }, [])

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      micRef.current?.stop()
      playerRef.current?.stop()
      try {
        sessionRef.current?.close()
      } catch {
        // ignore
      }
    }
  }, [])

  return {
    status,
    transcript,
    suggestions,
    error,
    micMuted,
    elapsed,
    sessionId,
    start,
    stop,
    toggleMute,
    sendVideoFrame,
    dismissSuggestion,
  }
}
