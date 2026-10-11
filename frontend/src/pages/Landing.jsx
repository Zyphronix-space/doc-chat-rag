import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import ProductDemo from '../components/marketing/ProductDemo'
import SplitText from '../components/marketing/SplitText'
import SpotlightCard from '../components/marketing/SpotlightCard'
import { MOTION_OK, ScrollTrigger, gsap, useGSAP } from '../components/marketing/motion'
import { scrollToSection } from '../components/marketing/useSmoothScroll'
import { LIMITS, POLICY } from '../config/site'

// Every capability below exists in this codebase (see README "API reference"
// and the Features page). Nothing here is aspirational.
const STEPS = [
  {
    title: 'Upload',
    body: `Add PDF, TXT or Markdown files (up to ${LIMITS.maxUploadMb} MB each). DocMind pulls the text out page by page, so it always knows which page a sentence came from.`,
  },
  {
    title: 'Organize',
    body: 'Group related files into collections, such as one per course, project or client, so a question can cover a single file or a whole set.',
  },
  {
    title: 'Ask',
    body: 'Pick what to search (one document, several, or a collection) and ask in plain language. The answer streams in as it’s written.',
  },
  {
    title: 'Check',
    body: 'Every answer lists the excerpts it used, with page numbers for PDFs. If your files don’t cover the question, DocMind says so instead of guessing.',
  },
]

const FEATURES = [
  {
    title: 'Citations down to the page',
    body: 'Each answer links to the exact passages it drew on. For PDFs that includes the real page number, never an estimated one.',
  },
  {
    title: 'An honest “not found”',
    body: 'When nothing relevant turns up in the files you picked, DocMind tells you, rather than filling the gap from general knowledge.',
  },
  {
    title: 'Collections and scoped chats',
    body: 'Chat with one file, a hand-picked set, or a whole collection. Add or remove a file and the collection’s chats see the change.',
  },
  {
    title: 'Search by meaning',
    body: 'Find passages by what they say, not just by filename. It uses the same retrieval that powers chat.',
  },
  {
    title: 'Conversations you can return to',
    body: 'Chats are saved with their sources. Rename them, search them, and pick up any thread later.',
  },
  {
    title: 'Measure answer quality yourself',
    body: 'Write test questions and see whether the right document was retrieved. An AI-judged “faithfulness” score is offered too, clearly labelled as a rough heuristic.',
  },
]

const FAQ = [
  {
    q: 'What exactly does DocMind do?',
    a: 'It answers questions using only the documents you upload, and shows the passages (and PDF page numbers) behind each answer so you can check it. It’s a reading and research aid, not a general chatbot.',
  },
  {
    q: 'Which files can I upload?',
    a: `PDF, plain text (.txt) and Markdown (.md), up to ${LIMITS.maxUploadMb} MB per file. PDFs need a text layer. Scanned images of pages can’t be read, because DocMind doesn’t do OCR.`,
  },
  {
    q: 'Can the answers be wrong?',
    a: 'Yes. AI can misread a passage or summarize it badly, which is why every answer shows its sources. Check the cited excerpts before relying on an answer, and don’t use DocMind as the only basis for legal, medical, financial or other important decisions.',
  },
  {
    q: 'Who can see my documents?',
    a: 'Inside DocMind, only your account. Every search is filtered to your own files. To work, the text is processed by Google’s Gemini API, and DocMind uses Gemini’s free tier, under which Google may use what it receives to improve its products and may have people review it. See “Your data” above and the Privacy Policy.',
  },
  {
    q: 'Should I upload confidential or personal information?',
    a: 'No. Because of how the free AI tier handles data, don’t upload confidential work documents, sensitive personal information (health, financial, ID numbers and the like), or documents about other people, especially children, unless you have the right to share them and are comfortable with the processing described in the Privacy Policy.',
  },
  {
    q: 'Does it cost anything?',
    a: 'No. DocMind is free, there are no paid plans, and it never asks for payment details. Because it runs on free-tier services, it can occasionally hit usage limits at busy times. When that happens, answers fail until the limit resets.',
  },
  {
    q: 'Do I need an account?',
    a: `You can read everything on this site without one. To upload documents and chat you need an account (just an email address and a password), and you must be ${POLICY.minimumAge} or older.`,
  },
  {
    q: 'How do I delete my data?',
    a: 'Delete any document whenever you like. That also removes its extracted text and search data. In Settings you can download a copy of your data or delete your account, which removes everything from the live database straight away. Database backups roll off within about a day.',
  },
  {
    q: 'Can I use DocMind in the EU, UK or Switzerland?',
    a: 'Not at the moment. Google only allows its paid Gemini service in apps offered to people in those regions, and DocMind currently uses the free tier.',
  },
  {
    q: 'I forgot my password. What now?',
    a: 'Self-service password reset by email isn’t switched on yet. Use the contact page and we’ll help you regain access after confirming the account is yours.',
  },
]

function SectionHeading({ id, eyebrow, title, intro }) {
  return (
    <div className="max-w-2xl" data-reveal>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-700 dark:text-accent-300">{eyebrow}</p>
      <h2 id={`${id}-title`} className="font-display mt-3 text-4xl leading-tight text-gray-900 sm:text-5xl dark:text-gray-50">
        {title}
      </h2>
      {intro && <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">{intro}</p>}
    </div>
  )
}

export default function Landing() {
  const rootRef = useRef(null)
  const location = useLocation()

  // Arriving from another page via /#section: scroll there once mounted.
  useEffect(() => {
    const id = location.hash.slice(1)
    if (id) requestAnimationFrame(() => scrollToSection(id))
  }, [location.hash])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION_OK, () => {
        gsap.from('[data-hero-fade]', { opacity: 0, y: 16, duration: 0.8, ease: 'power2.out', stagger: 0.12, delay: 0.35 })
        gsap.from('[data-hero-demo]', { opacity: 0, y: 40, scale: 0.98, duration: 1.1, ease: 'power3.out', delay: 0.55 })

        // Below-the-fold reveals. Hidden state is set here, inside the
        // motion-OK branch, so without JS or with reduced motion nothing is
        // ever hidden.
        const targets = gsap.utils.toArray('[data-reveal]')
        gsap.set(targets, { opacity: 0, y: 24 })
        ScrollTrigger.batch(targets, {
          start: 'top 88%',
          once: true,
          onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out', stagger: 0.08 }),
        })
      })
      return () => mm.revert()
    },
    { scope: rootRef },
  )

  return (
    <div ref={rootRef}>
      {/* ---------- Hero ---------- */}
      <section aria-labelledby="hero-title" className="hero-bg relative overflow-hidden">
        <div aria-hidden="true" className="ruled pointer-events-none absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <p
              data-hero-fade
              className="inline-flex items-center gap-2 rounded-full border border-accent-200 bg-white/70 px-3 py-1 text-xs font-semibold text-accent-800 dark:border-accent-800 dark:bg-gray-900/60 dark:text-accent-200"
            >
              Free · No card · {LIMITS.formats.join(', ')}
            </p>
            <SplitText
              as="h1"
              id="hero-title"
              text="Ask your documents. Get answers that cite the page."
              className="font-display mt-6 text-5xl leading-[1.05] text-gray-900 sm:text-6xl lg:text-7xl dark:text-gray-50"
            />
            <p data-hero-fade className="mx-auto mt-6 max-w-2xl text-lg text-gray-700 sm:text-xl dark:text-gray-300">
              Upload your notes, papers or manuals, then ask questions in plain language. DocMind answers from your files
              alone, shows the exact passage behind every answer, and tells you when the answer isn’t there.
            </p>
            <div data-hero-fade className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="inline-flex w-full items-center justify-center rounded-full bg-accent-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-accent-600/25 hover:bg-accent-700 sm:w-auto"
              >
                Get started free
              </Link>
              <Link
                to="/#features"
                onClick={(e) => {
                  e.preventDefault()
                  window.history.replaceState(null, '', '#features')
                  scrollToSection('features')
                }}
                className="inline-flex w-full items-center justify-center rounded-full border border-gray-300 bg-white/70 px-6 py-3 text-base font-semibold text-gray-900 hover:bg-white sm:w-auto dark:border-gray-600 dark:bg-gray-900/60 dark:text-gray-100 dark:hover:bg-gray-900"
              >
                Explore features
              </Link>
            </div>
          </div>

          <div data-hero-demo className="mx-auto mt-14 max-w-4xl">
            <ProductDemo />
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section id="how-it-works" tabIndex={-1} aria-labelledby="how-it-works-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading id="how-it-works" eyebrow="How it works" title="From a pile of files to answers you can check." />
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} data-reveal className="glass-panel rounded-2xl p-5">
              <span className="font-display text-4xl text-accent-600 dark:text-accent-300" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
                <span className="sr-only">Step {i + 1}: </span>
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Features ---------- */}
      <section id="features" tabIndex={-1} aria-labelledby="features-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          id="features"
          eyebrow="Features"
          title="Built around one rule: show your sources."
          intro="Everything listed here works today. There are no “coming soon” items."
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <SpotlightCard as="li" key={f.title} data-reveal className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{f.body}</p>
            </SpotlightCard>
          ))}
        </ul>
        <p className="mt-8" data-reveal>
          <Link to="/features" className="font-semibold text-accent-700 underline-offset-4 hover:underline dark:text-accent-300">
            See the full feature list →
          </Link>
        </p>
      </section>

      {/* ---------- Your data ---------- */}
      <section id="privacy" tabIndex={-1} aria-labelledby="privacy-title" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          id="privacy"
          eyebrow="Your data"
          title="What happens to a document after you upload it."
          intro="Here’s the full path your data takes, including the parts that leave DocMind."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <ol className="space-y-4" data-reveal>
            {[
              ['Stored', 'The original file, its extracted text and your account live in DocMind’s database, hosted on TiDB Cloud in Singapore. Traffic to and from it is encrypted (HTTPS and TLS).'],
              ['Indexed', 'The text is split into short passages, and each one is sent to Google’s Gemini API to create an “embedding”, a list of numbers used to find passages by meaning.'],
              ['Asked', 'When you ask a question, it’s embedded the same way, the closest passages from your files are found, and your question plus those passages go to Gemini to write the answer.'],
              ['Saved', 'The answer and its citations are saved in your conversation, so you can come back to them, until you delete them.'],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-600 text-sm font-semibold text-white"
                >
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="space-y-4" data-reveal>
            <div className="rounded-2xl border-2 border-amber-500 bg-amber-50 p-5 dark:border-amber-400 dark:bg-amber-950/40">
              <h3 className="font-semibold text-amber-950 dark:text-amber-100">Please read: free-tier AI</h3>
              <p className="mt-2 text-sm leading-relaxed text-amber-950 dark:text-amber-100">
                DocMind uses Google’s free Gemini API tier. Under Google’s terms, Google may use what it receives
                (your document text and questions) to improve its products, and people may review it. Don’t upload
                confidential or sensitive information.
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-5">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">You stay in control</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                <li>• Only your account can open your files. Every search is limited to your own data.</li>
                <li>• Delete a file and its text and search data go with it.</li>
                <li>• Download a copy of your data, or delete your account, from Settings.</li>
                <li>• No ads, no analytics, no tracking cookies.</li>
              </ul>
              <p className="mt-3 text-sm">
                <Link to="/privacy" className="font-semibold text-accent-700 underline dark:text-accent-300">
                  Read the Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" tabIndex={-1} aria-labelledby="faq-title" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <SectionHeading id="faq" eyebrow="FAQ" title="Straight answers." />
        <div className="faq mt-10 divide-y divide-[var(--glass-border)] rounded-2xl glass-panel" data-reveal>
          {FAQ.map((item) => (
            <details key={item.q} className="group px-5 py-4">
              <summary className="flex cursor-pointer items-center justify-between gap-4 rounded-md font-medium text-gray-900 dark:text-gray-100">
                {item.q}
                <span aria-hidden="true" className="faq-icon text-xl text-accent-600 transition-transform dark:text-accent-300">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- Closing CTA ---------- */}
      <section aria-labelledby="cta-title" className="px-4 pb-24 sm:px-6">
        <div
          data-reveal
          className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-accent-700 to-accent-900 px-6 py-14 text-center text-white shadow-xl"
        >
          <h2 id="cta-title" className="font-display text-4xl sm:text-5xl">
            Try it with a document you already have.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-accent-100">
            Lecture notes, a manual, a long report: upload it, ask a question, and check the answer against the page.
          </p>
          <Link
            to="/signup"
            className="mt-8 inline-flex rounded-full bg-white px-6 py-3 font-semibold text-accent-800 hover:bg-accent-50"
          >
            Create a free account
          </Link>
        </div>
      </section>
    </div>
  )
}
