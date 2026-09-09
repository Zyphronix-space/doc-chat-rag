import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GlassCard from '../components/glass/GlassCard'
import { GlassInput } from '../components/glass/GlassInput'
import GlassButton from '../components/glass/GlassButton'

export default function Signup() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <GlassCard raised className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl bg-accent-500 flex items-center justify-center text-white font-bold">D</div>
          <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">DocMind</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Create an account</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Your own private space for documents & chats.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <GlassInput
            id="register-email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <GlassInput
            id="register-password"
            label="Password (min 8 characters)"
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
            {submitting ? 'Creating account…' : 'Create account'}
          </GlassButton>
        </form>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-600 dark:text-accent-400 font-medium">
            Log in
          </Link>
        </p>
        <p className="text-xs text-gray-400 mt-3 text-center">
          By creating an account you agree to the{' '}
          <Link to="/terms" className="underline hover:text-accent-600 dark:hover:text-accent-400">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy-policy" className="underline hover:text-accent-600 dark:hover:text-accent-400">
            Privacy Policy
          </Link>
          .
        </p>
      </GlassCard>
    </div>
  )
}
