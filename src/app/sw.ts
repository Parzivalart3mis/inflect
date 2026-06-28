/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import {
  CacheFirst,
  ExpirationPlugin,
  Serwist,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    ...defaultCache,
    {
      matcher: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
      handler: new CacheFirst({
        cacheName: 'google-fonts',
        plugins: [
          new ExpirationPlugin({ maxAgeSeconds: 31_536_000, maxEntries: 30 }),
        ],
      }),
    },
  ],
})

serwist.addEventListeners()
