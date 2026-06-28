'use client'

import { useRouter } from 'next/navigation'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useTransition,
} from 'react'
import { toast } from 'sonner'

import { mutateJson } from '@/lib/fetcher'
import type { LanguageDTO } from '@/types/dto'

interface LanguageContextValue {
  languages: LanguageDTO[]
  activeLanguage: LanguageDTO | null
  activeLanguageId: string | null
  setActiveLanguage: (id: string) => void
  switching: boolean
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({
  initialLanguages,
  initialActiveId,
  children,
}: {
  initialLanguages: LanguageDTO[]
  initialActiveId: string | null
  children: React.ReactNode
}) {
  const router = useRouter()
  const [activeLanguageId, setActiveId] = useState<string | null>(
    initialActiveId,
  )
  const [pending, startTransition] = useTransition()

  const setActiveLanguage = useCallback(
    (id: string) => {
      if (id === activeLanguageId) return
      const prev = activeLanguageId
      setActiveId(id) // optimistic
      startTransition(async () => {
        try {
          await mutateJson('/api/users/active-language', 'PATCH', {
            languageId: id,
          })
          router.refresh()
        } catch {
          setActiveId(prev)
          toast.error('Could not switch language')
        }
      })
    },
    [activeLanguageId, router],
  )

  const value = useMemo<LanguageContextValue>(() => {
    const activeLanguage =
      initialLanguages.find((l) => l.id === activeLanguageId) ?? null
    return {
      languages: initialLanguages,
      activeLanguage,
      activeLanguageId,
      setActiveLanguage,
      switching: pending,
    }
  }, [initialLanguages, activeLanguageId, setActiveLanguage, pending])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}
