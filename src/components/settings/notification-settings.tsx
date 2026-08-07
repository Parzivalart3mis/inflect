'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

function swReady(): Promise<ServiceWorkerRegistration> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('no-sw')), 8000),
    ),
  ])
}

/**
 * Per-device toggle for the daily review reminder. "On" = this device is
 * subscribed to push (the cron notifies every subscribed device); "Off" removes
 * the subscription. A small Send test button remains for debugging.
 */
export function NotificationSettings() {
  const [supported, setSupported] = useState(true)
  const [ready, setReady] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      if (
        typeof window === 'undefined' ||
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
      ) {
        if (active) {
          setSupported(false)
          setReady(true)
        }
        return
      }
      try {
        const reg = await swReady()
        const sub = await reg.pushManager.getSubscription()
        if (active) setEnabled(!!sub && Notification.permission === 'granted')
      } catch {
        // service worker not active here (e.g. local dev)
      }
      if (active) setReady(true)
    })()
    return () => {
      active = false
    }
  }, [])

  async function toggle(next: boolean) {
    setNote(null)
    if (!VAPID_PUBLIC) {
      setNote('Push isn’t configured on this build.')
      return
    }

    if (next) {
      // Enable — request permission first, inside the tap (iOS is strict).
      if (Notification.permission === 'denied') {
        setNote('Notifications are blocked. Enable them for Inflect in Settings.')
        return
      }
      if (Notification.permission === 'default') {
        const perm = await Notification.requestPermission()
        if (perm !== 'granted') {
          setNote('Notification permission wasn’t granted.')
          return
        }
      }
    }

    setBusy(true)
    try {
      const reg = await swReady()

      if (next) {
        let sub = await reg.pushManager.getSubscription()
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC) as BufferSource,
          })
        }
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ subscription: sub, timezone }),
        })
        if (!res.ok) throw new Error('save')
        setEnabled(true)
        toast.success('Daily reminders on')
      } else {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          })
          await sub.unsubscribe()
        }
        setEnabled(false)
        toast.success('Reminders off')
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'no-sw') {
        setNote(
          'Not available here — use the installed app (Home Screen), not local dev.',
        )
      } else {
        setNote(
          'Couldn’t update. On iPhone, add Inflect to your Home Screen and open it from there.',
        )
      }
    } finally {
      setBusy(false)
    }
  }

  async function sendTest() {
    setNote(null)
    try {
      const res = await fetch('/api/push/test', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as { sent?: number }
      if (!res.ok) throw new Error()
      toast.success(
        (data.sent ?? 0) > 0 ? 'Test sent' : 'No enabled devices found',
      )
    } catch {
      toast.error('Could not send test')
    }
  }

  return (
    <div className="border-border bg-card rounded-xl border">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">Daily review reminder</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Around 8:00 PM, if you have cards due and haven’t studied yet.
          </p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={toggle}
          disabled={!ready || busy || !supported}
          aria-label="Daily review reminder"
        />
      </div>

      {!supported && (
        <p className="text-muted-foreground border-border border-t px-4 py-3 text-xs">
          To get reminders on iPhone, add Inflect to your Home Screen and open it
          from there.
        </p>
      )}
      {note && (
        <p className="text-muted-foreground border-border border-t px-4 py-3 text-xs">
          {note}
        </p>
      )}
      {enabled && (
        <div className="border-border border-t px-4 py-3">
          <Button size="sm" variant="ghost" onClick={sendTest}>
            Send test notification
          </Button>
        </div>
      )}
    </div>
  )
}
