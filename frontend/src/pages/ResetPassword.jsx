import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../api/auth'
import { useToast } from '../context/ToastContext'
import GlassCard from '../components/glass/GlassCard'
import { GlassInput } from '../components/glass/GlassInput'
import GlassButton from '../components/glass/GlassButton'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const navigate = useNavigate()
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await resetPassword(token, password)
      toast.success('Password reset. Log in with your new password.')
      navigate('/login')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <GlassCard raised className="w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Reset password</h1>
        {!token ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            Missing reset token. Use the link from the Forgot Password page.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <GlassInput
              id="reset-password"
              label="New password (min 8 characters)"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <GlassButton type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Resetting…' : 'Reset password'}
            </GlassButton>
          </form>
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
