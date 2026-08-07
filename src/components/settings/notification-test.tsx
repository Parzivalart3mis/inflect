'use client'

import { Bell, Loader2 } from 'lucide-react'
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
 * Proof-of-concept: subscribes to push (creating the subscription on first use)
 * and asks the server to send one test notification to it. No persistence — it
 * only proves end-to-end delivery works on this device.
 */
export function NotificationTest() {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function sendTest() {
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
        'This browser can’t receive web push. On iPhone, add Inflect to your Home Screen and open it from there first.',
      )
      return
    }

    // Ask for permission first, while still inside the tap gesture — iOS
    // rejects a permission prompt requested after unrelated awaits.
    if (Notification.permission === 'denied') {
      setMsg('Notifications are blocked. Enable them for Inflect in iOS Settings.')
      return
    }
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setMsg('Notification permission wasn’t granted.')
        return
      }
    }

    setBusy(true)
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

      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      })
      if (!res.ok) throw new Error(String(res.status))

      setMsg('Sent — it should appear on your device in a moment.')
      toast.success('Test notification sent')
    } catch (err) {
      if (err instanceof Error && err.message === 'no-sw') {
        setMsg(
          'Service worker isn’t active here. Test on the deployed, installed app (not local dev).',
        )
      } else {
        setMsg(
          'Couldn’t send the test. Make sure notifications are allowed and the app is installed to your Home Screen.',
        )
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">Test notification</p>
          <p className="text-muted-foreground mt-0.5 text-xs">
            iPhone: add Inflect to your Home Screen and open it from there, then
            tap to confirm push works.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={sendTest}
          disabled={busy}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Bell className="size-4" />
          )}
          Send test
        </Button>
      </div>
      {msg && <p className="text-muted-foreground mt-2 text-xs">{msg}</p>}
    </div>
  )
}
