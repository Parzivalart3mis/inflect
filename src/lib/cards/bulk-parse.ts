export interface ParsedCard {
  front: string
  back?: string
}

export interface BulkParseResult {
  cards: ParsedCard[]
  skipped: number
}

/** Map an Anki `#separator:` value (a name or a literal char) to a delimiter. */
function normalizeSeparator(value: string): string {
  switch (value.toLowerCase()) {
    case 'tab':
      return '\t'
    case 'comma':
      return ','
    case 'semicolon':
      return ';'
    case 'space':
      return ' '
    case 'pipe':
      return '|'
    case 'colon':
      return ':'
    default:
      return value || '\t'
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
}

/**
 * Strip HTML that Anki wraps around fields (e.g. `<b>`, `<br>`, `<div>`) and
 * decode common entities. A no-op for plain text with no tags or entities.
 */
function stripHtml(value: string): string {
  if (!value.includes('<') && !value.includes('&')) return value
  let out = value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
  for (const [entity, char] of Object.entries(NAMED_ENTITIES)) {
    out = out.replaceAll(entity, char)
  }
  out = out
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  return out.replace(/\n{2,}/g, '\n').trim()
}

/**
 * Parses pasted text into cards. Each line is one card; the front and optional
 * back are separated by a tab or a pipe (`|`). Lines with an empty front are
 * skipped and counted. Values are clamped to the API's 1000-char field limit.
 *
 * Also accepts Anki's "Notes in Plain Text" export: `#`-prefixed header lines
 * are skipped, a `#separator:` header sets the delimiter, only the first two
 * columns (Front/Back) are used, and HTML in fields is stripped.
 */
export function parseBulkCards(raw: string): BulkParseResult {
  const cards: ParsedCard[] = []
  let skipped = 0

  // First pass: pull out Anki header directives and keep the data lines.
  let separator: string | null = null
  let sawHeader = false
  const lines: string[] = []
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith('#')) {
      sawHeader = true
      const match = /^#separator:(.*)$/i.exec(line)
      if (match) separator = normalizeSeparator(match[1].trim())
      continue // skip all header/comment lines
    }
    lines.push(line)
  }

  for (const line of lines) {
    if (!line.trim()) continue // blank lines are ignored, not "skipped"

    let parts: string[]
    if (separator) {
      parts = line.split(separator)
    } else if (line.includes('\t')) {
      parts = line.split('\t')
    } else {
      parts = line.split('|')
    }

    let front = (parts[0] ?? '').trim()
    // For an Anki export, columns beyond Back (e.g. tags) are dropped; for a
    // plain paste, extra pipe segments still fold into the back.
    let back = sawHeader
      ? (parts[1] ?? '').trim()
      : parts
          .slice(1)
          .map((p) => p.trim())
          .join(' | ')
          .trim()

    front = stripHtml(front)
    back = stripHtml(back)

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
