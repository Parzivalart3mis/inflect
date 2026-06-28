export interface ParsedCard {
  front: string
  back?: string
}

export interface BulkParseResult {
  cards: ParsedCard[]
  skipped: number
}

/**
 * Parses pasted text into cards. Each line is one card; the front and optional
 * back are separated by a tab or a pipe (`|`). Lines with an empty front are
 * skipped and counted. Values are clamped to the API's 1000-char field limit.
 */
export function parseBulkCards(raw: string): BulkParseResult {
  const lines = raw.split(/\r?\n/)
  const cards: ParsedCard[] = []
  let skipped = 0

  for (const line of lines) {
    if (!line.trim()) continue // blank lines are ignored, not "skipped"

    // Prefer tab; fall back to pipe.
    const parts = line.includes('\t') ? line.split('\t') : line.split('|')
    const front = parts[0]?.trim() ?? ''
    const back = parts
      .slice(1)
      .map((p) => p.trim())
      .join(' | ')
      .trim()

    if (!front) {
      skipped += 1
      continue
    }

    cards.push({
      front: front.slice(0, 1000),
      ...(back ? { back: back.slice(0, 1000) } : {}),
    })
  }

  return { cards, skipped }
}
