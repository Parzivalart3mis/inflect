import { SignUp } from '@clerk/nextjs'

import { Wordmark } from '@/components/brand/wordmark'

export default function SignUpPage() {
  return (
    <main className="app-shell flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-10">
      <div className="text-center">
        <Wordmark className="text-3xl" />
        <p className="text-muted-foreground mt-2 max-w-xs text-sm text-balance">
          Start your warm place to learn a language.
        </p>
      </div>
      <SignUp
        appearance={{
          variables: {
            colorPrimary: '#7C4A1E',
            colorBackground: '#F0E9DC',
            borderRadius: '0.75rem',
          },
        }}
      />
    </main>
  )
}
