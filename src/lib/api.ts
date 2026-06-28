import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/** Standard error shape: { error: { code, message } } */
export class ApiError extends Error {
  code: string
  status: number
  constructor(code: string, message: string, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

export const Errors = {
  unauthorized: () => new ApiError('unauthorized', 'Not signed in', 401),
  forbidden: () => new ApiError('forbidden', 'You do not own this resource', 403),
  notFound: (what = 'Resource') =>
    new ApiError('not_found', `${what} not found`, 404),
  rateLimited: (message = 'Too many requests') =>
    new ApiError('rate_limited', message, 429),
  badRequest: (message: string) => new ApiError('bad_request', message, 400),
}

export function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

/** Returns the Clerk userId or throws an ApiError(401). */
export async function requireUser(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw Errors.unauthorized()
  return userId
}

/**
 * Wraps a route handler: converts thrown ApiError / ZodError into the
 * standard error envelope, and anything else into a 500.
 */
export function route<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse> | Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args)
    } catch (err) {
      if (err instanceof ApiError) {
        return errorResponse(err.code, err.message, err.status)
      }
      if (err instanceof ZodError) {
        const first = err.issues[0]
        const path = first?.path.join('.')
        return errorResponse(
          'validation_error',
          path ? `${path}: ${first.message}` : first?.message ?? 'Invalid input',
          400,
        )
      }
      // Avoid leaking internals; Sentry captures the real error via instrumentation.
      console.error('[api] unhandled error', err)
      return errorResponse('internal_error', 'Something went wrong', 500)
    }
  }
}

/** Parse + validate JSON body against a Zod schema. */
export async function parseBody<T>(
  request: Request,
  schema: { parse: (v: unknown) => T },
): Promise<T> {
  let json: unknown
  try {
    json = await request.json()
  } catch {
    throw Errors.badRequest('Invalid JSON body')
  }
  return schema.parse(json)
}
