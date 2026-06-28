import { auth, currentUser } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'

import { Errors } from '@/lib/api'

import { db } from './index'
import { users, type User } from './schema'

/**
 * Returns the DB user row for the current Clerk session, creating it on first
 * touch if the Clerk webhook hasn't synced it yet. Throws 401 if signed out.
 */
export async function getOrCreateUser(): Promise<User> {
  const { userId } = await auth()
  if (!userId) throw Errors.unauthorized()

  const existing = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })
  if (existing) return existing

  const clerkUser = await currentUser()
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses[0]?.emailAddress ??
    `${userId}@placeholder.inflect`

  const [created] = await db
    .insert(users)
    .values({ id: userId, email })
    .onConflictDoUpdate({ target: users.id, set: { email } })
    .returning()

  return created
}

/** Lightweight: just the current user id (401 if absent). */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw Errors.unauthorized()
  return userId
}
