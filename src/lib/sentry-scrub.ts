import type { ErrorEvent } from '@sentry/nextjs'

/**
 * Strips PII before events leave the device/server:
 *  - user email
 *  - any request body (may contain note/transcript content)
 *  - query strings on the URL
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.user) {
    delete event.user.email
    delete event.user.username
    delete event.user.ip_address
  }
  if (event.request) {
    delete event.request.data
    delete event.request.cookies
    if (event.request.url) {
      event.request.url = event.request.url.split('?')[0]
    }
  }
  return event
}
