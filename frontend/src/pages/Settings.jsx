import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { changePassword, deleteAccount, exportMyData } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Dialog from '../components/common/Dialog'
import { openCookieSettings } from '../lib/consent'
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
        <p className="text-sm text-gray-900 dark:text-gray-100 mt-0.5">
          {new Date(user.created_at).toLocaleDateString()}
        </p>
      </div>
      <DataAndPrivacy />
    </div>
  )
}

function DataAndPrivacy() {
  const toast = useToast()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await exportMyData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `docmind-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Your data export has downloaded.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
      <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">Your data and privacy</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">
        Download a copy of everything DocMind stores about you: your account details, documents and their extracted
        text, collections and conversations.
      </p>
      <div className="flex flex-wrap gap-2">
        <GlassButton onClick={handleExport} disabled={exporting}>
          {exporting ? 'Preparing…' : 'Download my data'}
        </GlassButton>
        <GlassButton variant="ghost" onClick={openCookieSettings}>
          Cookie settings
        </GlassButton>
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
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const deletePasswordRef = useRef(null)

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

  const closeDeleteDialog = () => {
    if (deleting) return
    setConfirmingDelete(false)
    setDeletePassword('')
    setDeleteError(null)
  }

  const handleDeleteAccount = async (e) => {
    e.preventDefault()
    setDeleteError(null)
    setDeleting(true)
    try {
      await deleteAccount(deletePassword)
      toast.success('Account deleted.')
      // Leave the protected area first: clearing the session while still on
      // /settings would make ProtectedRoute bounce to /login instead.
      navigate('/', { replace: true })
      await logout()
    } catch (err) {
      setDeleteError(err.status === 403 ? 'That password is incorrect.' : err.message)
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
        <GlassButton variant="danger" onClick={() => setConfirmingDelete(true)}>
          Delete account
        </GlassButton>
      </div>

      <Dialog
        open={confirmingDelete}
        onClose={closeDeleteDialog}
        title="Delete account?"
        description="This permanently removes your account, documents, collections, conversations, and citations. This can't be undone. Enter your password to confirm."
        role="alertdialog"
        className="max-w-sm"
        initialFocusRef={deletePasswordRef}
      >
        <form onSubmit={handleDeleteAccount} className="mt-4 space-y-3">
          <GlassInput
            ref={deletePasswordRef}
            label="Password"
            type="password"
            required
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            autoComplete="current-password"
          />
          {deleteError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {deleteError}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeDeleteDialog}
              disabled={deleting}
              className="px-3 py-1.5 rounded-md text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={deleting || !deletePassword}
              className="px-3 py-1.5 rounded-md text-sm text-white bg-red-700 hover:bg-red-800 disabled:opacity-60"
            >
              {deleting ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        </form>
      </Dialog>
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
              type="button"
              aria-pressed={tab === key}
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
      <nav aria-label="Legal" className="flex items-center gap-4 mt-4 text-xs text-gray-600 dark:text-gray-400">
        <Link to="/privacy" className="hover:text-accent-600 dark:hover:text-accent-400">
          Privacy Policy
        </Link>
        <Link to="/terms" className="hover:text-accent-600 dark:hover:text-accent-400">
          Terms and Conditions
        </Link>
        <Link to="/cookies" className="hover:text-accent-600 dark:hover:text-accent-400">
          Cookie Policy
        </Link>
      </nav>
    </div>
  )
}
