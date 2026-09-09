import { Link } from 'react-router-dom'

export default function LegalLayout({ title, children }) {
  return (
    <section className="max-w-2xl mx-auto px-4 py-14">
      <Link to="/" className="text-sm text-accent-600 dark:text-accent-400 font-medium">
        Back to DocMind
      </Link>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-6">{title}</h1>
      <div className="legal-content text-sm text-gray-600 dark:text-gray-300 space-y-4">{children}</div>
    </section>
  )
}
