'use client'

import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react'
import type { RefObject } from 'react'

/**
 * Applies Markdown syntax to the current textarea selection so users get
 * formatting without typing the markup. `onMouseDown` preventDefault keeps the
 * textarea's selection intact when a toolbar button is pressed.
 */
export function MarkdownToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (next: string) => void
}) {
  function wrap(ta: HTMLTextAreaElement, before: string, after = before) {
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.slice(start, end)
    const next = value.slice(0, start) + before + selected + after + value.slice(end)
    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(start + before.length, end + before.length)
    })
  }

  function linePrefix(ta: HTMLTextAreaElement, prefix: string) {
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const nextNewline = value.indexOf('\n', end)
    const lineEnd = nextNewline === -1 ? value.length : nextNewline
    const block = value.slice(lineStart, lineEnd)
    const prefixed = block
      .split('\n')
      .map((line) => prefix + line)
      .join('\n')
    const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd)
    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(lineStart, lineStart + prefixed.length)
    })
  }

  const items = [
    { icon: Bold, label: 'Bold', act: (ta: HTMLTextAreaElement) => wrap(ta, '**') },
    { icon: Italic, label: 'Italic', act: (ta: HTMLTextAreaElement) => wrap(ta, '_') },
    { icon: Heading1, label: 'Heading 1', act: (ta: HTMLTextAreaElement) => linePrefix(ta, '# ') },
    { icon: Heading2, label: 'Heading 2', act: (ta: HTMLTextAreaElement) => linePrefix(ta, '## ') },
    { icon: List, label: 'Bulleted list', act: (ta: HTMLTextAreaElement) => linePrefix(ta, '- ') },
    { icon: ListOrdered, label: 'Numbered list', act: (ta: HTMLTextAreaElement) => linePrefix(ta, '1. ') },
    { icon: Quote, label: 'Quote', act: (ta: HTMLTextAreaElement) => linePrefix(ta, '> ') },
    { icon: Code, label: 'Inline code', act: (ta: HTMLTextAreaElement) => wrap(ta, '`') },
    { icon: LinkIcon, label: 'Link', act: (ta: HTMLTextAreaElement) => wrap(ta, '[', '](https://)') },
  ]

  return (
    <div className="border-border flex items-center gap-0.5 overflow-x-auto border-y py-1">
      {items.map(({ icon: Icon, label, act }) => (
        <button
          key={label}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const ta = textareaRef.current
            if (ta) act(ta)
          }}
          aria-label={label}
          title={label}
          className="text-muted-foreground hover:text-foreground hover:bg-accent flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
        >
          <Icon className="size-4" />
        </button>
      ))}
    </div>
  )
}
