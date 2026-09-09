import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { changePassword, deleteAccount } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/common/ConfirmDialog'
import GlassCard from '../components/glass/GlassCard'
import { GlassInput } from '../components/glass/GlassInput'
import GlassButton from '../components/glass/GlassButton'

function ProfileTab({ user }) {
  return (
    <div className="space-y-4 max-w-md">
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</p>
        <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">{user.email}</p>
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Account created</p>
        <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">{new Date(user.created_at).toLocaleDateString()}</p>
      </div>
    </div>
  )
}

function SecurityTab() {
  const { logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      toast.success('Password changed.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setConfirmingDelete(false)
    setDeleting(true)
    try {
      await deleteAccount()
      toast.success('Account deleted.')
      await logout()
      navigate('/')
    } catch (err) {
      toast.error(err.message)
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <form onSubmit={handleChangePassword} className="space-y-3">
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Change password</h2>
        <GlassInput
          label="Current password"
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
        <GlassInput
          label="New password (min 8 characters)"
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <GlassButton type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Change password'}
        </GlassButton>
      </form>

      <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-4">
        <h2 className="text-sm font-medium text-red-700 dark:text-red-300">Danger zone</h2>
        <p className="text-sm text-red-600/80 dark:text-red-300/70 mt-1 mb-3">
          Deleting your account permanently removes your documents, collections, conversations, and citations.
        </p>
        <GlassButton variant="danger" onClick={() => setConfirmingDelete(true)} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete account'}
        </GlassButton>
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete account?"
        description="This permanently removes your account, documents, collections, conversations, and citations. This can't be undone."
        confirmLabel="Delete account"
        danger
        onConfirm={handleDeleteAccount}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const [tab, setTab] = useState('profile')

  if (!user) return null

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Settings</h1>
      <GlassCard>
        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 mb-5">
          {[
            ['profile', 'Profile'],
            ['security', 'Security'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === key
                  ? 'border-accent-500 text-accent-600 dark:text-accent-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === 'profile' ? <ProfileTab user={user} /> : <SecurityTab />}
      </GlassCard>
      <nav className="flex items-center gap-4 mt-4 text-xs text-gray-400">
        <Link to="/privacy-policy" className="hover:text-accent-600 dark:hover:text-accent-400">
          Privacy Policy
        </Link>
        <Link to="/terms" className="hover:text-accent-600 dark:hover:text-accent-400">
          Terms and Conditions
        </Link>
        <Link to="/cookie-policy" className="hover:text-accent-600 dark:hover:text-accent-400">
          Cookie Policy
        </Link>
      </nav>
    </div>
  )
}
