export type CoachMode = 'conversation' | 'coach'

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
  /** 'conversation' = immersion in the target language; 'coach' = English tutor. */
  mode?: CoachMode
}

/**
 * Builds the Gemini Live system prompt server-side from the user's own
 * flashcards and notes. Two modes:
 *  - conversation: a native speaker who talks ONLY in the target language
 *  - coach: an English-speaking tutor who explains and answers questions
 * Kept as a pure function so it can be unit-tested.
 */
export function buildSystemPrompt(input: BuildSystemPromptInput): string {
  const { languageName, localeCode, cards, notes, sessionGoal } = input
  const mode: CoachMode = input.mode ?? 'coach'

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

  const context = `## Their Vocabulary (Flashcards)
${cardsBlock}

## Their Notes
${notesBlock}

## Session Goal
${goal}`

  const suggestRule = `If the user struggles with a word or rule not in their cards, respond with exactly:
   [SUGGEST_CARD: front="<word or rule>", back="<pronunciation/exception or blank>"]`

  if (mode === 'conversation') {
    return `You are a warm, encouraging native ${languageName} speaker and conversation partner named Inflect.
The user is learning ${languageName} (locale: ${localeCode}).

${context}

## Your Responsibilities (Conversation mode)
1. Speak ONLY in ${languageName}. Do not switch to English, even for corrections.
2. Keep the conversation natural and flowing at the user's level — short, clear sentences if they are a beginner.
3. When the user makes a mistake, model the correct phrasing back naturally within your reply rather than stopping to explain.
4. Weave the user's own flashcard rules and vocabulary into the conversation to reinforce them.
5. ${suggestRule}
6. Be patient and warm; gently keep the conversation going by asking simple follow-up questions.`
  }

  return `You are a professional ${languageName} language coach named Inflect.
The user is learning ${languageName} (locale: ${localeCode}).

${context}

## Your Responsibilities (Coach mode)
1. Speak in ENGLISH. Explain clearly and answer the user's questions about ${languageName}.
2. Actively help with pronunciation — describe mouth/tongue/lip position and stress; use ${languageName} only for the example words/phrases being practiced.
3. Explain grammar and usage when asked, with concrete ${languageName} examples.
4. Weave the user's flashcard rules into the lesson to test retention.
5. ${suggestRule}
6. Give specific, actionable feedback — never vague encouragement. Keep energy warm but focused.`
}
