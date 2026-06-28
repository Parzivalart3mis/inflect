'use client'

import { SWRConfig } from 'swr'

import { LanguageProvider } from '@/components/providers/language-provider'
import { fetcher } from '@/lib/fetcher'
import type { LanguageDTO } from '@/types/dto'

export function AppProviders({
  languages,
  activeId,
  children,
}: {
  languages: LanguageDTO[]
  activeId: string | null
  children: React.ReactNode
}) {
  return (
    <SWRConfig
      value={{
        fetcher,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
      }}
    >
      <LanguageProvider
        initialLanguages={languages}
        initialActiveId={activeId}
      >
        {children}
      </LanguageProvider>
    </SWRConfig>
  )
}
