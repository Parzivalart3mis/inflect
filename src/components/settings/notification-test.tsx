'use client'

import { Bell, BellRing, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

/**
 * POC for closed-app delivery:
 *  1. "Enable on this device" saves the push subscription server-side.
 *  2. "Send test to my devices" asks the server to push to every saved device —
 *     trigger it from your laptop while the phone's app is fully closed.
 */
export function NotificationTest() {
  const [enabling, setEnabling] = useState(false)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function enableOnThisDevice() {
    setMsg(null)
    if (!VAPID_PUBLIC) {
      setMsg('Push isn’t configured on this build (missing VAPID key).')
      return
    }
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setMsg(
        'This browser can’t receive web push. On iPhone, add Inflect to your Home Screen and open it from there.',
      )
      return
    }

    if (Notification.permission === 'denied') {
      setMsg('Notifications are blocked. Enable them for Inflect in Settings.')
      return
    }
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setMsg('Notification permission wasn’t granted.')
        return
      }
    }

    setEnabling(true)
    try {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('no-sw')), 8000),
        ),
      ])
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
      if (!res.ok) throw new Error(String(res.status))
      setMsg('This device is enabled. Now close the app and send a test from another device.')
      toast.success('Notifications enabled on this device')
    } catch (err) {
      if (err instanceof Error && err.message === 'no-sw') {
        setMsg('Service worker isn’t active here. Use the deployed, installed app (not local dev).')
      } else {
        setMsg('Couldn’t enable. Make sure notifications are allowed and the app is installed.')
      }
    } finally {
      setEnabling(false)
    }
  }

  async function sendTest() {
    setMsg(null)
    setSending(true)
    try {
      const res = await fetch('/api/push/test', { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as {
        sent?: number
        removed?: number
      }
      if (!res.ok) throw new Error(String(res.status))
      if ((data.sent ?? 0) === 0) {
        setMsg('No enabled devices found. Tap "Enable on this device" first.')
      } else {
        setMsg(`Sent to ${data.sent} device${data.sent === 1 ? '' : 's'}.`)
        toast.success('Test push sent')
      }
    } catch {
      setMsg('Could not send the test push.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="border-border bg-card space-y-3 rounded-xl border p-4">
      <div>
        <p className="text-sm font-medium">Review reminders (preview)</p>
        <p className="text-muted-foreground mt-0.5 text-xs">
          On iPhone, add Inflect to your Home Screen and open it from there.
          Enable this device, then close the app and send a test from your
          laptop to confirm it arrives while closed.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={enableOnThisDevice}
          disabled={enabling}
        >
          {enabling ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Bell className="size-4" />
          )}
          Enable on this device
        </Button>
        <Button size="sm" onClick={sendTest} disabled={sending}>
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <BellRing className="size-4" />
          )}
          Send test to my devices
        </Button>
      </div>
      {msg && <p className="text-muted-foreground text-xs">{msg}</p>}
    </div>
  )
}
