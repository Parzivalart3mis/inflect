function escapeCell(value: string | number | boolean | null): string {
  const s = value == null ? '' : String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/** Build a CSV string from a header row and data rows. */
export function toCsv(
  headers: string[],
  rows: (string | number | boolean | null)[][],
): string {
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','))
  }
  // CRLF line endings for maximum spreadsheet compatibility.
  return lines.join('\r\n')
}

/** Make a filename-safe slug from a deck name. */
export function slugifyFilename(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'deck'
}
