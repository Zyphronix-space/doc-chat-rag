import GlassCard from '../components/glass/GlassCard'

const SECTIONS = [
  {
    title: 'Document management',
    items: [
      ['Upload PDF, TXT, or Markdown', 'Up to 20MB per file, validated on the server before anything is stored.'],
      ['Live processing status', 'Pending → Processing → Ready/Failed, polled live while a document is being ingested.'],
      ['Rename, move, delete', 'Rename a document, move it into a collection, or delete it (removing its extracted chunks too).'],
      ['Search & filter', 'Filter by filename, collection, or status; sort by upload date.'],
      ['Semantic search', "Search across the actual content of every document you own, not just filenames — the same embed-and-retrieve path chat uses, so results are ranked by real relevance."],
    ],
  },
  {
    title: 'Collections',
    items: [
      ['Group related documents', 'Create folders like "University" or "Research" to organize what you upload.'],
      ['Chat with a whole collection', "Scope a conversation to every ready document in a collection at once — add or remove documents later and the collection's chat scope updates automatically."],
    ],
  },
  {
    title: 'Chat',
    items: [
      ['Multi-document scope', 'Chat against one document, several, or a whole collection — the scope is always visible.'],
      ['Streaming answers', 'Responses stream in token by token, with a stop button if you change your mind.'],
      ['Grounded, not guessed', "If your documents don't cover a question, DocMind says it couldn't find the answer instead of inventing one."],
      ['Real citations', 'Every answer shows exactly which chunks (and, for PDFs, which real page numbers) it drew from — expandable to the exact excerpt.'],
      ['Think longer', 'Optionally trade speed for a more thorough, more carefully reasoned answer.'],
    ],
  },
  {
    title: 'Evaluation & analytics',
    items: [
      ['Retrieval hit-rate', 'A direct, unambiguous measurement: was the expected source document actually retrieved for a test question?'],
      ['Faithfulness scoring', "A second model acts as a judge — always labeled as a heuristic, never presented as a certified benchmark, and only shown when it parses cleanly."],
      ['Real usage analytics', 'Documents processed, questions asked, and activity over time — computed from your actual account data, never simulated.'],
    ],
  },
]

export default function Features() {
  return (
    <section className="max-w-4xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 text-center">
        Everything DocMind actually does
      </h1>
      <p className="text-center text-gray-500 dark:text-gray-400 mt-2 max-w-xl mx-auto">
        No placeholder features — every item below maps to something real and working.
      </p>

      <div className="mt-12 space-y-10">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">{section.title}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {section.items.map(([title, body]) => (
                <GlassCard key={title}>
                  <p className="font-medium text-sm text-gray-800 dark:text-gray-100">{title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{body}</p>
                </GlassCard>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
