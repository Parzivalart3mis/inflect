import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { Webhook } from 'svix'

import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'

type ClerkEmail = { id: string; email_address: string }
type ClerkUserData = {
  id: string
  email_addresses?: ClerkEmail[]
  primary_email_address_id?: string | null
}
type ClerkEvent = {
  type: string
  data: ClerkUserData
}

function primaryEmail(data: ClerkUserData): string | null {
  const list = data.email_addresses ?? []
  if (list.length === 0) return null
  const primary = list.find((e) => e.id === data.primary_email_address_id)
  return (primary ?? list[0]).email_address ?? null
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: { code: 'config_error', message: 'Webhook not configured' } },
      { status: 500 },
    )
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: { code: 'bad_request', message: 'Missing svix headers' } },
      { status: 400 },
    )
  }

  const body = await req.text()

  let event: ClerkEvent
  try {
    const wh = new Webhook(secret)
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkEvent
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_signature', message: 'Invalid signature' } },
      { status: 400 },
    )
  }

  switch (event.type) {
    case 'user.created':
    case 'user.updated': {
      const email = primaryEmail(event.data)
      if (email) {
        await db
          .insert(users)
          .values({ id: event.data.id, email })
          .onConflictDoUpdate({ target: users.id, set: { email } })
      }
      break
    }
    case 'user.deleted': {
      if (event.data.id) {
        await db.delete(users).where(eq(users.id, event.data.id))
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}
