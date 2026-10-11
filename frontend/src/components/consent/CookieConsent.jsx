import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import Dialog from '../common/Dialog'
import {
  CATEGORIES,
  acceptAll,
  getConsent,
  onOpenCookieSettings,
  rejectOptional,
  setConsent,
} from '../../lib/consent'

// All three choices share one visual weight on purpose: rejecting must be
// exactly as easy and as prominent as accepting.
const CHOICE_BTN =
  'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-900/70 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'

function Toggle({ checked, disabled, onChange, labelledBy, describedBy }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 transition-colors disabled:cursor-not-allowed ${
        checked ? 'bg-accent-600 border-accent-600' : 'bg-gray-300 border-gray-500 dark:bg-gray-700 dark:border-gray-400'
      } ${disabled ? 'opacity-70' : ''}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
      <span className="sr-only">{checked ? 'On' : 'Off'}</span>
    </button>
  )
}

function CategoryRow({ category, checked, onChange }) {
  const labelId = useId()
  const descId = useId()
  return (
    <li className="py-3 border-t border-gray-200 dark:border-gray-700 first:border-t-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id={labelId} className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {category.label}
            {category.required && <span className="ml-2 text-xs font-normal text-gray-600 dark:text-gray-300">(always on)</span>}
          </p>
          <p id={descId} className="text-xs text-gray-600 dark:text-gray-300 mt-1">
            {category.description}
          </p>
        </div>
        <Toggle
          checked={category.required ? true : checked}
          disabled={category.required}
          onChange={onChange}
          labelledBy={labelId}
          describedBy={descId}
        />
      </div>
      <details className="mt-2 text-xs text-gray-600 dark:text-gray-300">
        <summary className="cursor-pointer select-none">What this stores</summary>
        <ul className="mt-1 space-y-1">
          {category.items.map((item) => (
            <li key={item.key}>
              <code className="font-mono">{item.key}</code> ({item.type}): {item.purpose}. Kept: {item.duration}.
            </li>
          ))}
        </ul>
      </details>
    </li>
  )
}

/**
 * The first-visit banner plus the preferences panel. Mounted once at the
 * app root, so it covers public pages and the signed-in workspace alike.
 */
export default function CookieConsent() {
  const [decided, setDecided] = useState(() => getConsent() !== null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [draft, setDraft] = useState({})

  useEffect(
    () =>
      onOpenCookieSettings(() => {
        const current = getConsent()
        setDraft({ ...(current?.categories || {}) })
        setPanelOpen(true)
      }),
    [],
  )

  const finish = (fn) => () => {
    fn()
    setDecided(true)
    setPanelOpen(false)
  }

  const openPanel = () => {
    setDraft({ ...(getConsent()?.categories || {}) })
    setPanelOpen(true)
  }

  return (
    <>
      {!decided && !panelOpen && (
        <section
          aria-labelledby="cookie-banner-title"
          className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4"
        >
          <div className="mx-auto max-w-3xl glass-panel glass-panel-raised rounded-2xl p-4 sm:p-5 shadow-lg">
            <h2 id="cookie-banner-title" className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Cookies and browser storage
            </h2>
            <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">
              DocMind has no ads, analytics or tracking. It stores your sign-in in your browser because it can’t work
              without that. With your OK it will also remember your light or dark theme. See the{' '}
              <Link to="/cookies" className="underline text-accent-700 dark:text-accent-300">
                Cookie Policy
              </Link>
              .
            </p>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button type="button" className={CHOICE_BTN} onClick={finish(acceptAll)}>
                Accept all
              </button>
              <button type="button" className={CHOICE_BTN} onClick={finish(rejectOptional)}>
                Reject optional
              </button>
              <button type="button" className={CHOICE_BTN} onClick={openPanel}>
                Customize
              </button>
            </div>
          </div>
        </section>
      )}

      <Dialog
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title="Cookie and storage preferences"
        description="Choose what DocMind may keep in this browser. You can change this at any time from the footer or Settings."
        className="max-w-lg"
      >
        <ul>
          {CATEGORIES.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              checked={draft[c.id] === true}
              onChange={(value) => setDraft((d) => ({ ...d, [c.id]: value }))}
            />
          ))}
        </ul>
        <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button type="button" className={CHOICE_BTN} onClick={finish(rejectOptional)}>
            Reject optional
          </button>
          <button type="button" className={CHOICE_BTN} onClick={finish(acceptAll)}>
            Accept all
          </button>
          <button type="button" className={CHOICE_BTN} onClick={finish(() => setConsent(draft))}>
            Save choices
          </button>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-3">
          Full details: <Link to="/cookies" className="underline" onClick={() => setPanelOpen(false)}>Cookie Policy</Link>
        </p>
      </Dialog>
    </>
  )
}
