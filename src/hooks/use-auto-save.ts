'use client'

import { useEffect, useRef, useState } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Options<T> {
  value: T
  onSave: (value: T) => Promise<void>
  delay?: number
  /** Disable saving (e.g. while the resource is still loading). */
  enabled?: boolean
}

/**
 * Debounced autosave. Watches `value`; after `delay` ms of no changes it calls
 * `onSave`. Exposes a status for "Saving… / Saved" UI. The first render is
 * treated as the baseline and never triggers a save.
 */
export function useAutoSave<T>({
  value,
  onSave,
  delay = 1000,
  enabled = true,
}: Options<T>) {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const savedRef = useRef<T>(value)
  const onSaveRef = useRef(onSave)
  const firstRun = useRef(true)

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    if (!enabled) return
    if (firstRun.current) {
      firstRun.current = false
      savedRef.current = value
      return
    }
    if (Object.is(value, savedRef.current)) return

    setStatus('saving')
    const handle = setTimeout(async () => {
      try {
        await onSaveRef.current(value)
        savedRef.current = value
        setStatus('saved')
      } catch {
        setStatus('error')
      }
    }, delay)

    return () => clearTimeout(handle)
  }, [value, delay, enabled])

  return { status, setStatus }
}
