/** mm:ss for a duration in seconds. */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** "3 min" style label. */
export function formatMinutes(totalSeconds: number | null): string {
  if (!totalSeconds) return '0 min'
  const m = Math.round(totalSeconds / 60)
  return `${m} min`
}

/** Short relative-ish date for lists. */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}
