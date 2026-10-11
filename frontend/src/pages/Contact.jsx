import { Link } from 'react-router-dom'
import { ContactEmail, Detail } from './legal/LegalLayout'
import { BUSINESS } from '../config/site'

export default function Contact() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-4xl text-gray-900 sm:text-5xl dark:text-gray-50">Contact & privacy requests</h1>
      <p className="mt-4 text-gray-800 dark:text-gray-200">
        DocMind is run by <Detail value={BUSINESS.operatorName} label="operator name" />, {BUSINESS.operatorDescription}.
        It’s a one-person project, so there’s no phone line or live chat. Email is the way to reach us.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <section aria-labelledby="support-title" className="glass-panel rounded-2xl p-5">
          <h2 id="support-title" className="font-semibold text-gray-900 dark:text-gray-100">
            Help and account access
          </h2>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Problems, questions, or locked out of your account: <ContactEmail />
          </p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Self-service password reset isn’t switched on yet. Email us from your account’s address and we’ll help you get
            back in once we’ve confirmed it’s you. We’ll never ask for your password.
          </p>
        </section>

        <section aria-labelledby="privacy-title" className="glass-panel rounded-2xl p-5">
          <h2 id="privacy-title" className="font-semibold text-gray-900 dark:text-gray-100">
            Privacy and data requests
          </h2>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Access, correction, deletion, objections, or questions about your data: <ContactEmail kind="privacy" />
          </p>
          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
            Signed in? You can do most of this yourself under <strong>Settings → Account</strong>: download your data, or
            delete your account and everything in it.
          </p>
        </section>
      </div>

      <section aria-labelledby="request-tips" className="mt-8 text-sm text-gray-800 dark:text-gray-200">
        <h2 id="request-tips" className="font-semibold text-gray-900 dark:text-gray-100">
          Making a request
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Send it from the email address on your DocMind account, so we can confirm it’s yours.</li>
          <li>Say what you’d like us to do. Please don’t attach your documents or include your password.</li>
          <li>We aim to reply within one month. More detail is in the <Link to="/privacy#your-rights" className="underline">Privacy Policy</Link>.</li>
        </ul>
      </section>
    </article>
  )
}
