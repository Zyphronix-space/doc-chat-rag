import { useState } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../api/auth'
import GlassCard from '../components/glass/GlassCard'
import { GlassInput } from '../components/glass/GlassInput'
import GlassButton from '../components/glass/GlassButton'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await forgotPassword(email)
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <GlassCard raised className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Forgot password</h1>

        {!result ? (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Enter your account email and we'll generate a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <GlassInput
                id="forgot-email"
                label="Email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <GlassButton type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Sending…' : 'Send reset link'}
              </GlassButton>
            </form>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 dark:text-gray-400">{result.message}</p>
            {result.demo_reset_link ? (
              <div className="rounded-xl border border-accent-300 dark:border-accent-700 bg-accent-50 dark:bg-accent-900/20 p-3">
                <p className="text-xs font-medium text-accent-700 dark:text-accent-300 mb-2">
                  DEMO MODE — no email provider is configured for this project, so the reset link is shown here
                  instead of being emailed. It expires in {result.expires_in_minutes} minutes and works once.
                </p>
                <Link
                  to={result.demo_reset_link.replace(window.location.origin, '')}
                  className="text-xs font-mono break-all text-accent-700 dark:text-accent-300 underline"
                >
                  {result.demo_reset_link}
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-400">If that email is registered, check the link it generated for.</p>
            )}
          </div>
        )}

        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
          <Link to="/login" className="text-accent-600 dark:text-accent-400 font-medium">
            Back to log in
          </Link>
        </p>
      </GlassCard>
    </div>
  )
}
