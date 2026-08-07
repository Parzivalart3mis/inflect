'use client'

import { useEffect, useState } from 'react'

import { Wordmark } from '@/components/brand/wordmark'

// Show the branded splash briefly on a fresh load/refresh, then fade out.
// It's server-rendered into the first paint (so no flash of the app), sits as a
// fixed overlay above the app (so fading it out causes no layout shift), and
// mounts once per full page load — client-side navigations don't retrigger it.
const MIN_VISIBLE_MS = 650
const FADE_MS = 450

export function SplashScreen() {
  const [hidden, setHidden] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setHidden(true), MIN_VISIBLE_MS)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!hidden) return
    const t = setTimeout(() => setGone(true), FADE_MS)
    return () => clearTimeout(t)
  }, [hidden])

  if (gone) return null

  return (
    <div className="splash-screen" data-hidden={hidden ? '' : undefined} aria-hidden>
      <div className="splash-glow" />
      <div className="splash-mark">
        <Wordmark className="text-4xl sm:text-5xl" />
        <div className="splash-bar" />
      </div>
    </div>
  )
}
