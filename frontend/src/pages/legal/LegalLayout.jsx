import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BUSINESS, POLICY } from '../../config/site'

/** Renders a business detail, or a visible marker when the owner hasn't supplied it yet. */
export function Detail({ value, label }) {
  if (value) return <>{value}</>
  return (
    <mark className="rounded bg-amber-100 px-1 text-amber-950 dark:bg-amber-900 dark:text-amber-50">
      [{label}: to be provided]
    </mark>
  )
}

export function ContactEmail({ kind = 'support' }) {
  const email = kind === 'privacy' ? BUSINESS.privacyEmail : BUSINESS.supportEmail
  if (!email) return <Detail value={null} label={`${kind} email`} />
  return <a href={`mailto:${email}`}>{email}</a>
}

export default function LegalLayout({ title, summary, toc = [], children }) {
  const { hash } = useLocation()

  // Deep links like /privacy#your-rights work on first load and on reload.
  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }))
  }, [hash])

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <Link to="/" className="text-sm font-medium text-accent-700 hover:underline dark:text-accent-300">
        ← Back to DocMind
      </Link>
      <h1 className="font-display mt-4 text-4xl text-gray-900 sm:text-5xl dark:text-gray-50">{title}</h1>
      <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">Last updated: {POLICY.lastUpdated}</p>
      {summary && (
        <div className="glass-panel mt-6 rounded-2xl p-5 text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          {summary}
        </div>
      )}
      {toc.length > 0 && (
        <nav aria-label="On this page" className="mt-6 text-sm">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">On this page</h2>
          <ol className="mt-2 grid gap-1 sm:grid-cols-2">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-accent-700 hover:underline dark:text-accent-300">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="legal-content mt-8 space-y-4 text-[0.95rem] leading-relaxed text-gray-800 dark:text-gray-200">
        {children}
      </div>
    </article>
  )
}
