export interface PromptCard {
  front: string
  back?: string | null
}

export interface PromptNote {
  title: string
  content: string
}

export interface BuildSystemPromptInput {
  languageName: string
  localeCode: string
  cards: PromptCard[]
  notes: PromptNote[]
  sessionGoal?: string | null
}

/**
 * Builds the Gemini Live system prompt server-side from the user's own
 * flashcards and notes. Kept as a pure function so it can be unit-tested.
 */
export function buildSystemPrompt(input: BuildSystemPromptInput): string {
  const { languageName, localeCode, cards, notes, sessionGoal } = input

  const cardsBlock = cards.length
    ? cards
        .map(
          (c) =>
            `- RULE: ${c.front}${c.back ? `\n  EXCEPTION: ${c.back}` : ''}`,
        )
        .join('\n')
    : '(No flashcards yet — help the user create their first rules.)'

  const notesBlock = notes.length
    ? notes.map((n) => `### ${n.title || 'Untitled'}\n${n.content}`).join('\n\n')
    : '(No notes yet.)'

  const goal =
    sessionGoal && sessionGoal.trim().length > 0
      ? sessionGoal.trim()
      : `Open practice — help the user speak and think in ${languageName}`

  return `You are a professional ${languageName} language coach named Inflect.
The user is learning ${languageName} (locale: ${localeCode}).

## Their Grammar Rules (Flashcards)
${cardsBlock}

## Their Notes
${notesBlock}

## Session Goal
${goal}

## Your Responsibilities
1. Converse naturally in ${languageName}, switching to English only for explanations
2. Actively correct pronunciation — describe mouth/tongue position when helpful
3. Weave the user's flashcard rules into conversation naturally to test retention
4. If the user struggles with something not in their cards, respond with exactly:
   [SUGGEST_CARD: front="<rule>", back="<exception or blank>"]
5. Give specific, actionable feedback — never vague encouragement
6. Keep energy warm but focused`
}
