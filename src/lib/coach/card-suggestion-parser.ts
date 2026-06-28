export interface SuggestedCard {
  front: string
  back?: string
}

/**
 * Parses `[SUGGEST_CARD: front="...", back="..."]` tokens emitted by the coach.
 * Returns every suggestion found in the text (back omitted when blank).
 *
 * Handles escaped quotes inside values (\") and tolerates missing `back`.
 */
export function parseCardSuggestions(text: string): SuggestedCard[] {
  if (!text) return []

  const results: SuggestedCard[] = []
  // Match the whole token, non-greedy up to the closing bracket.
  const tokenRe = /\[SUGGEST_CARD:\s*([^\]]*)\]/gi

  let match: RegExpExecArray | null
  while ((match = tokenRe.exec(text)) !== null) {
    const body = match[1]
    const front = extractField(body, 'front')
    if (!front) continue
    const back = extractField(body, 'back')
    results.push(back ? { front, back } : { front })
  }
  return results
}

function extractField(body: string, field: string): string | undefined {
  // field="value" — value may contain escaped quotes.
  const re = new RegExp(`${field}\\s*=\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'i')
  const m = body.match(re)
  if (!m) return undefined
  const value = m[1].replace(/\\"/g, '"').trim()
  return value.length ? value : undefined
}

/** True if the text contains at least one suggestion token. */
export function hasCardSuggestion(text: string): boolean {
  return /\[SUGGEST_CARD:/i.test(text)
}

/** Removes all suggestion tokens from text (for clean transcript display). */
export function stripCardSuggestions(text: string): string {
  return text.replace(/\[SUGGEST_CARD:\s*[^\]]*\]/gi, '').trim()
}
