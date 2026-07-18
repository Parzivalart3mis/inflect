import { auth } from '@clerk/nextjs/server'
import { ChartNoAxesColumn, Layers, Mic, NotebookPen } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { Wordmark } from '@/components/brand/wordmark'
import { Button } from '@/components/ui/button'

const FEATURES = [
  {
    icon: NotebookPen,
    title: 'Notes that think like you',
    body: 'Write grammar rules in your own words, formatted and searchable — your personal reference, always a tap away.',
  },
  {
    icon: Layers,
    title: 'Vocabulary that sticks',
    body: 'Spaced repetition brings words back exactly when you’re about to forget them, with native pronunciation on every card.',
  },
  {
    icon: Mic,
    title: 'An AI coach that talks back',
    body: 'Practise out loud in a real conversation. Your coach knows your notes and your cards, so it meets you where you are.',
  },
  {
    icon: ChartNoAxesColumn,
    title: 'See it compound',
    body: 'Streaks, retention and a breakdown of what’s still shaky — so you always know what to study next.',
  },
]

export default async function Home() {
  const { userId } = await auth()
  if (userId) redirect('/notes')

  return (
    <main className="min-h-dvh">
      {/* ---------- Top bar ---------- */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 lg:px-8 lg:py-7">
        <Wordmark className="text-xl lg:text-2xl" />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/sign-in" />}>
            Sign in
          </Button>
          {/* Desktop keeps a persistent primary action in the bar */}
          <Button
            className="bg-cta text-cta-foreground hover:bg-cta/90 hidden lg:inline-flex"
            render={<Link href="/sign-up" />}
          >
            Get started
          </Button>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:py-16">
          <div className="py-10 text-center lg:py-0 lg:text-left">
            <span className="border-border bg-card text-muted-foreground inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
              Notebook · Flashcards · AI coach
            </span>

            <h1 className="font-heading text-foreground mt-5 text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl lg:mt-6 lg:text-6xl">
              Learn a language the way it actually{' '}
              <span className="text-primary">sticks</span>.
            </h1>

            <p className="text-muted-foreground mx-auto mt-4 max-w-md text-base leading-relaxed text-pretty lg:mx-0 lg:mt-6 lg:max-w-lg lg:text-lg">
              Inflect keeps your grammar notes, your vocabulary and your
              speaking practice in one place — so every session builds on the
              last instead of starting over.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mx-auto sm:max-w-sm lg:mx-0 lg:mt-9 lg:max-w-none lg:flex-row">
              <Button
                size="lg"
                className="bg-cta text-cta-foreground hover:bg-cta/90 h-12 text-base"
                render={<Link href="/sign-up" />}
              >
                Start learning free
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 text-base"
                render={<Link href="/sign-in" />}
              >
                I already have an account
              </Button>
            </div>

            <p className="text-muted-foreground/80 mt-4 text-xs lg:mt-5">
              Free to use · Works offline as an app on your phone
            </p>
          </div>

          {/* Hero visual — a layered mock. Compact strip on mobile, full stack on desktop. */}
          <div className="pb-10 lg:pb-0">
            <PreviewStack />
          </div>
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="mx-auto max-w-6xl px-5 pb-16 lg:px-8 lg:pb-24">
        <h2 className="font-heading text-foreground text-center text-2xl font-semibold tracking-tight lg:text-3xl">
          Everything in one loop
        </h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-center text-sm text-balance lg:text-base">
          Read it, drill it, say it out loud. Each part feeds the next.
        </p>

        {/* Mobile: stacked rows. Desktop: 4-up grid of cards. */}
        <ul className="mt-8 grid gap-3 lg:mt-12 lg:grid-cols-4 lg:gap-5">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="border-border bg-card flex items-start gap-4 rounded-2xl border p-4 lg:flex-col lg:gap-3 lg:p-6"
            >
              <span className="bg-cta/15 text-cta flex size-10 shrink-0 items-center justify-center rounded-xl lg:size-11">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-heading text-card-foreground font-semibold">
                  {title}
                </h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Closing CTA ---------- */}
      <section className="mx-auto max-w-6xl px-5 pb-16 lg:px-8 lg:pb-24">
        <div className="border-border bg-card flex flex-col items-center gap-5 rounded-3xl border px-6 py-10 text-center lg:flex-row lg:justify-between lg:px-12 lg:py-12 lg:text-left">
          <div>
            <h2 className="font-heading text-card-foreground text-2xl font-semibold tracking-tight text-balance lg:text-3xl">
              Start with one word today.
            </h2>
            <p className="text-muted-foreground mt-2 text-sm lg:text-base">
              Set up your first language in under a minute.
            </p>
          </div>
          <Button
            size="lg"
            className="bg-cta text-cta-foreground hover:bg-cta/90 h-12 w-full px-8 text-base lg:w-auto"
            render={<Link href="/sign-up" />}
          >
            Create your account
          </Button>
        </div>
      </section>

      <footer className="border-border/60 mx-auto max-w-6xl border-t px-5 py-8 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-3 lg:flex-row">
          <Wordmark className="text-base" />
          <p className="text-muted-foreground/80 text-xs">
            Your grammar notebook, flashcard deck, and AI language coach.
          </p>
        </div>
      </footer>
    </main>
  )
}

/**
 * Decorative product preview. On mobile it collapses to a single wide card so
 * the hero stays short; on desktop it fans out into a layered stack.
 */
function PreviewStack() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-none" aria-hidden>
      {/* Flashcard — the anchor of the stack */}
      <div className="border-border bg-card relative z-10 rounded-2xl border p-6 shadow-md lg:rounded-3xl lg:p-8">
        <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          Vocabulary
        </span>
        <p className="font-heading text-card-foreground mt-3 text-2xl font-semibold lg:text-3xl">
          to sell
        </p>
        <div className="border-border/70 mt-4 border-t pt-4">
          <p className="text-primary text-xl font-semibold lg:text-2xl">
            vender
          </p>
          <p className="text-muted-foreground mt-0.5 text-sm">(vehn-DEHR)</p>
        </div>
      </div>

      {/* Note peeking behind — desktop only */}
      <div className="border-border bg-secondary absolute -top-6 -right-6 -z-0 hidden w-56 rotate-3 rounded-2xl border p-4 shadow-sm lg:block">
        <p className="font-heading text-secondary-foreground text-sm font-semibold">
          Lecture 12
        </p>
        <div className="mt-2 space-y-1.5">
          <span className="bg-muted-foreground/20 block h-1.5 w-full rounded-full" />
          <span className="bg-muted-foreground/20 block h-1.5 w-4/5 rounded-full" />
          <span className="bg-muted-foreground/20 block h-1.5 w-3/5 rounded-full" />
        </div>
      </div>

      {/* Coach chip — desktop only */}
      <div className="border-border bg-background absolute -bottom-5 -left-5 hidden items-center gap-2 rounded-full border px-4 py-2 shadow-sm lg:inline-flex">
        <span className="bg-cta/15 text-cta flex size-7 items-center justify-center rounded-full">
          <Mic className="size-3.5" />
        </span>
        <span className="text-foreground text-sm font-medium">
          “¿Qué quieres practicar?”
        </span>
      </div>
    </div>
  )
}
