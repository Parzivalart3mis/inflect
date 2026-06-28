import { AppShell } from '@/components/layout/app-shell'
import { FirstLanguageOnboarding } from '@/components/language/first-language-onboarding'
import { AppProviders } from '@/components/providers/app-providers'
import { getOrCreateUser } from '@/lib/db/user'
import { listLanguages } from '@/lib/db/workspace'

export const dynamic = 'force-dynamic'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getOrCreateUser()
  const languages = await listLanguages(user.id)

  if (languages.length === 0) {
    // Brand-new account — gate the whole app behind first-language setup.
    return (
      <AppProviders languages={[]} activeId={null}>
        <FirstLanguageOnboarding />
      </AppProviders>
    )
  }

  const activeId =
    user.activeLanguageId &&
    languages.some((l) => l.id === user.activeLanguageId)
      ? user.activeLanguageId
      : languages[0].id

  return (
    <AppProviders languages={languages} activeId={activeId}>
      <AppShell>{children}</AppShell>
    </AppProviders>
  )
}
