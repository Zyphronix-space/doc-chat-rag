import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import GlassCard from '../components/glass/GlassCard'
import { GlassInput } from '../components/glass/GlassInput'
import GlassButton from '../components/glass/GlassButton'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
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
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Welcome back</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Log in to chat with your documents.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <GlassInput
            id="login-email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <GlassInput
            id="login-password"
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <GlassButton type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Logging in…' : 'Log in'}
          </GlassButton>
        </form>
        <div className="flex items-center justify-between mt-4 text-sm">
          <Link to="/forgot-password" className="text-gray-500 dark:text-gray-400 hover:text-accent-600">
            Forgot password?
          </Link>
          <Link to="/signup" className="text-accent-600 dark:text-accent-400 font-medium">
            Create account
          </Link>
        </div>
      </GlassCard>
    </div>
  )
}
