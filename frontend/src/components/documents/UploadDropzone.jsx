import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { uploadDocument } from '../../api/documents'
import { LIMITS } from '../../config/site'
import { useToast } from '../../context/ToastContext'

const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md']
// Mirrors the deployment's MAX_FILE_SIZE_MB (see config/site.js) — this is a
// fast-fail UX nicety only; the server re-validates both checks
// authoritatively regardless of what the client thinks.
const MAX_FILE_SIZE_MB = LIMITS.maxUploadMb

export default function UploadDropzone({ collectionId, onUploaded }) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef(null)
  const noticeId = useId()
  const toast = useToast()

  const doUpload = async (file) => {
    if (!file) return

    const ext = `.${file.name.split('.').pop()?.toLowerCase() || ''}`
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`"${file.name}": only PDF, TXT, or MD files are supported.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds the ${MAX_FILE_SIZE_MB} MB limit.`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    setProgress(0)
    try {
      const doc = await uploadDocument(file, { collectionId, onProgress: setProgress })
      if (doc.duplicate) {
        toast.info(`"${file.name}" was already uploaded. Reusing the existing document.`)
      } else if (doc.status === 'failed') {
        toast.error(`"${file.name}" failed to process: ${doc.status_error}`)
      } else {
        toast.success(`"${file.name}" uploaded and processed (${doc.chunk_count} chunks).`)
      }
      onUploaded?.(doc)
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div>
      <label
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-colors ${
          dragActive
            ? 'border-accent-500 bg-accent-50 dark:bg-accent-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-accent-400'
        } focus-within:ring-2 focus-within:ring-accent-400 focus-within:ring-offset-2 dark:focus-within:ring-offset-gray-900 ${
          uploading ? 'pointer-events-none opacity-70' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragActive(true)
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragActive(false)
          doUpload(e.dataTransfer.files[0])
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          onChange={(e) => doUpload(e.target.files[0])}
          disabled={uploading}
          aria-describedby={noticeId}
          className="sr-only"
        />
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="text-accent-500"
          aria-hidden="true"
        >
          <path d="M12 16V4M12 4l-4 4M12 4l4 4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {uploading ? (
          <div className="w-full max-w-xs">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-1" aria-live="polite">
              Uploading… {progress}%
            </p>
            <div
              role="progressbar"
              aria-label="Upload progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
            >
              <div className="h-full bg-accent-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              Drag & drop a file, or click to browse
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">PDF, TXT, or MD, up to {MAX_FILE_SIZE_MB} MB</p>
          </>
        )}
      </label>
      <p id={noticeId} className="mt-2 text-xs text-gray-600 dark:text-gray-400">
        DocMind uses the free tier of Google’s Gemini API: the text of what you upload, and your questions, are sent to
        Google, which may use them to improve its products, and human reviewers may read them. Don’t upload confidential
        or sensitive personal information.{' '}
        <Link to="/privacy" className="underline text-accent-700 dark:text-accent-400">
          Privacy Policy
        </Link>
      </p>
    </div>
  )
}
