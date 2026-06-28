import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'

import * as schema from './schema'

export { schema }

type DB = NeonHttpDatabase<typeof schema>

let _db: DB | null = null

function getDb(): DB {
  if (_db) return _db
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }
  const sql = neon(connectionString)
  _db = drizzle(sql, { schema })
  return _db
}

/**
 * Lazy DB proxy — the Neon client is only constructed on first real query,
 * never at import/build time. This keeps `next build` from failing when
 * DATABASE_URL is unavailable in the build environment.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const instance = getDb()
    const value = instance[prop as keyof DB]
    return typeof value === 'function' ? value.bind(instance) : value
  },
})
