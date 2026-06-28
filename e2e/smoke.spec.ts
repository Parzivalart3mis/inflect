import { expect, test } from '@playwright/test'

/**
 * Smoke tests that run without authentication. Full authenticated flows
 * (note → card → review, coach start/end) require Clerk test credentials and a
 * seeded database — wire those via a Playwright global-setup that signs in and
 * stores `storageState`, then add specs that assume an authenticated context.
 */

test('unauthenticated visitor is redirected to sign-in', async ({ page }) => {
  await page.goto('/notes')
  await expect(page).toHaveURL(/sign-in/)
})

test('sign-in page renders the Inflect brand', async ({ page }) => {
  await page.goto('/sign-in')
  await expect(page.getByText('Inflect').first()).toBeVisible()
})

test('manifest is served for PWA install', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body.name).toBe('Inflect')
  expect(body.display).toBe('standalone')
})
