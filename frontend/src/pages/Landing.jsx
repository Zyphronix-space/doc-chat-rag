import { Link } from 'react-router-dom'
import GlassCard from '../components/glass/GlassCard'
import GlassButton from '../components/glass/GlassButton'

const FEATURES = [
  {
    title: 'Upload anything',
    body: 'PDF, TXT, or Markdown. Each page is extracted and chunked separately, so citations can point at the real page a fact came from.',
  },
  {
    title: 'Organize into collections',
    body: 'Group related documents, such as "University," "Research," or "Contracts," and chat against a whole collection at once.',
  },
  {
    title: 'Chat, grounded',
    body: "Answers come only from what's actually in your documents. If it's not there, DocMind says so instead of guessing.",
  },
  {
    title: 'Real citations',
    body: 'Every answer shows exactly which document, which chunk, and, for PDFs, which real page number it was grounded in.',
  },
  {
    title: 'Persistent conversations',
    body: 'Every chat is saved, searchable, and scoped to the documents you picked, so you can pick up any thread later.',
  },
  {
    title: 'Honest evaluation',
    body: "A small RAG evaluation framework: retrieval hit-rate is measured directly, and faithfulness scoring is clearly labeled as a judge model's heuristic, not a certified benchmark.",
  },
]

export default function Landing() {
  return (
    <>
      <section className="max-w-3xl mx-auto text-center px-4 pt-20 pb-14">
        <p className="text-xs font-semibold tracking-wide text-accent-600 dark:text-accent-400 uppercase mb-4">
          AI Document Intelligence
        </p>
        <h1 className="text-4xl sm:text-5xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">
          Your documents, turned into a knowledge base you can talk to.
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-5 text-lg">
          Upload, organize, and chat with your documents. Every answer is grounded in real excerpts,
          with citations down to the page number when one exists.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8">
          <Link to="/signup">
            <GlassButton size="lg">Create a free account</GlassButton>
          </Link>
          <Link to="/features">
            <GlassButton variant="ghost" size="lg">
              See how it works
            </GlassButton>
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <GlassCard key={f.title} className="flex flex-col gap-2">
              <div
                aria-hidden="true"
                className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center text-white font-bold text-sm"
              >
                {f.title.charAt(0)}
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">{f.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{f.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>
    </>
  )
}
