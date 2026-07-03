'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '@/lib/utils'

/**
 * Renders note markdown to formatted, styled output. Raw HTML is NOT enabled
 * (react-markdown escapes it by default) so note content can't inject markup —
 * safe to render user input. Element styles are kept in sync with the app theme.
 */
export function MarkdownView({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  return (
    <div
      className={cn('note-content text-[16px] leading-relaxed', className)}
      dir="auto"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h1 className="font-heading mt-4 mb-2 text-2xl font-bold" {...props} />
          ),
          h2: (props) => (
            <h2
              className="font-heading mt-4 mb-2 text-xl font-semibold"
              {...props}
            />
          ),
          h3: (props) => (
            <h3
              className="font-heading mt-3 mb-1.5 text-lg font-semibold"
              {...props}
            />
          ),
          p: (props) => <p className="my-2" {...props} />,
          ul: (props) => (
            <ul className="my-2 list-disc space-y-1 pl-5" {...props} />
          ),
          ol: (props) => (
            <ol className="my-2 list-decimal space-y-1 pl-5" {...props} />
          ),
          li: (props) => <li className="leading-relaxed" {...props} />,
          strong: (props) => <strong className="font-semibold" {...props} />,
          em: (props) => <em className="italic" {...props} />,
          blockquote: (props) => (
            <blockquote
              className="border-border text-muted-foreground my-2 border-l-2 pl-3 italic"
              {...props}
            />
          ),
          code: (props) => (
            <code
              className="bg-muted rounded px-1 py-0.5 font-mono text-[0.85em]"
              {...props}
            />
          ),
          pre: (props) => (
            <pre
              className="bg-muted my-2 overflow-x-auto rounded-lg p-3 text-[0.85em]"
              {...props}
            />
          ),
          a: (props) => (
            <a
              className="text-primary underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          hr: (props) => <hr className="border-border my-4" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
