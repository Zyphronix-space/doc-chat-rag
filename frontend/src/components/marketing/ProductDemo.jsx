import { useState } from 'react'

// Synthetic sample data, written for this illustration. Not a real user's
// document, conversation, or account.
const DOC = 'networking-lecture-04.pdf'
const SOURCES = [
  {
    id: 1,
    page: 7,
    before: 'A TCP connection is opened with a three-way handshake. ',
    highlight: 'The client sends SYN, the server replies with SYN-ACK, and the client confirms with ACK.',
    after: ' Only then can either side send data.',
  },
  {
    id: 2,
    page: 9,
    before: 'Unlike TCP, ',
    highlight: 'UDP is connectionless: it has no handshake and no delivery guarantee.',
    after: ' That makes it a good fit for DNS lookups and live audio.',
  },
]

function CitationChip({ source, active, onSelect }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(source.id)}
      className={`mx-0.5 inline-flex items-center rounded-md px-1.5 py-0.5 align-baseline font-mono text-[0.7rem] font-semibold transition-colors ${
        active
          ? 'bg-accent-600 text-white'
          : 'bg-accent-100 text-accent-800 hover:bg-accent-200 dark:bg-accent-900/60 dark:text-accent-100 dark:hover:bg-accent-800'
      }`}
    >
      <span className="sr-only">Show source {source.id}, </span>p.{source.page}
    </button>
  )
}

export default function ProductDemo() {
  const [activeId, setActiveId] = useState(1)
  const active = SOURCES.find((s) => s.id === activeId)

  return (
    <figure className="demo-frame" aria-labelledby="demo-caption">
      <div className="flex items-center gap-1.5 border-b border-[var(--glass-border)] px-4 py-2.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
        <span className="h-2.5 w-2.5 rounded-full bg-gray-300 dark:bg-gray-600" />
        <span className="ml-3 text-xs text-gray-600 dark:text-gray-300">Chat · scoped to {DOC}</span>
      </div>

      <div className="grid md:grid-cols-[1.15fr_1fr]">
        <div className="space-y-4 p-4 sm:p-5">
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent-600 px-3.5 py-2 text-sm text-white">
            How does a TCP connection start, and how is UDP different?
          </div>
          <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-white/80 px-3.5 py-2.5 text-sm leading-relaxed text-gray-800 shadow-sm dark:bg-gray-800/80 dark:text-gray-100">
            TCP opens a connection with a three-way handshake: SYN, then SYN-ACK, then ACK
            <CitationChip source={SOURCES[0]} active={activeId === 1} onSelect={setActiveId} />. UDP skips this
            entirely. It’s connectionless and doesn’t guarantee delivery
            <CitationChip source={SOURCES[1]} active={activeId === 2} onSelect={setActiveId} />.
          </div>
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-accent-600 px-3.5 py-2 text-sm text-white">
            Who invented TCP?
          </div>
          <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-dashed border-gray-400 px-3.5 py-2.5 text-sm text-gray-700 dark:border-gray-500 dark:text-gray-200">
            I couldn’t find that information in the selected documents.
          </div>
        </div>

        <aside
          aria-label="Source excerpt for the selected citation"
          className="border-t border-[var(--glass-border)] bg-white/50 p-4 sm:p-5 md:border-l md:border-t-0 dark:bg-gray-900/40"
        >
          <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300">Source {active.id}</p>
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
            {DOC} <span className="font-mono text-accent-700 dark:text-accent-300">· page {active.page}</span>
          </p>
          <blockquote className="excerpt mt-3" aria-live="polite">
            {active.before}
            <mark>{active.highlight}</mark>
            {active.after}
          </blockquote>
        </aside>
      </div>
      <figcaption id="demo-caption" className="border-t border-[var(--glass-border)] px-4 py-2 text-xs text-gray-600 dark:text-gray-300">
        Illustration with made-up sample data. Select a page chip to see the excerpt an answer came from.
      </figcaption>
    </figure>
  )
}
