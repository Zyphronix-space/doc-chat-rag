// Browser-storage consent, framework-free so non-React code (ThemeContext's
// initializer) can read it synchronously.
//
// DocMind uses no cookies and no analytics, advertising or tracking of any
// kind. What it does use is localStorage, which consent rules treat the
// same way as cookies:
//   - strictly necessary: the sign-in token and this consent record itself
//   - preferences (optional): remembering your light/dark theme choice
// Only categories that correspond to storage the app actually uses exist
// here. Add a category only alongside the code it gates.

const CONSENT_KEY = 'docmind_consent'
// Bump when categories change so everyone is asked again.
export const CONSENT_VERSION = 1

export const CATEGORIES = [
  {
    id: 'necessary',
    label: 'Strictly necessary',
    required: true,
    description:
      'Keeps you signed in, and remembers the choice you make in this panel. DocMind can’t work without these, so they can’t be switched off.',
    items: [
      { key: 'doc_chat_rag_token', type: 'localStorage', purpose: 'Your sign-in session token', duration: 'Until you log out, or 2 hours after sign-in' },
      { key: CONSENT_KEY, type: 'localStorage', purpose: 'Your choice in this panel', duration: 'Until you change it or clear site data' },
    ],
  },
  {
    id: 'preferences',
    label: 'Preferences',
    required: false,
    description:
      'Remembers whether you chose light or dark mode. If this is off, DocMind follows your device setting, and a theme you pick lasts only until you close the tab.',
    items: [
      { key: 'doc_chat_rag_theme', type: 'localStorage', purpose: 'Your light/dark theme choice', duration: 'Until you change it or clear site data' },
    ],
  },
]

// Storage keys to delete when a category is withdrawn.
const KEYS_BY_CATEGORY = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.items.filter((i) => i.key !== CONSENT_KEY).map((i) => i.key)]),
)

const listeners = new Set()

function read() {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.version === CONSENT_VERSION ? parsed : null
  } catch {
    return null
  }
}

/** The stored decision, or null if the visitor hasn't chosen (or must re-choose). */
export function getConsent() {
  return read()
}

/** Whether an optional category may be used right now. Necessary is always true. */
export function hasConsent(categoryId) {
  if (categoryId === 'necessary') return true
  return read()?.categories?.[categoryId] === true
}

/** Records a decision. `choices` maps optional category ids to booleans. */
export function setConsent(choices) {
  const categories = {}
  for (const c of CATEGORIES) {
    if (!c.required) categories[c.id] = choices[c.id] === true
  }
  const record = { version: CONSENT_VERSION, decidedAt: new Date().toISOString(), categories }
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record))
  } catch {
    // storage unavailable (private mode quota etc.) -- the choice still applies for this page
  }
  // Withdrawing consent must actually remove what it covered.
  for (const [id, allowed] of Object.entries(categories)) {
    if (!allowed) {
      for (const key of KEYS_BY_CATEGORY[id] || []) {
        try {
          localStorage.removeItem(key)
        } catch {
          // ignore
        }
      }
    }
  }
  listeners.forEach((fn) => fn(record))
  return record
}

export function acceptAll() {
  return setConsent(Object.fromEntries(CATEGORIES.filter((c) => !c.required).map((c) => [c.id, true])))
}

export function rejectOptional() {
  return setConsent({})
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Lets any component (footer link, Settings, Cookie Policy) reopen the panel.
const OPEN_EVENT = 'docmind:open-cookie-settings'
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT))
}
export function onOpenCookieSettings(fn) {
  window.addEventListener(OPEN_EVENT, fn)
  return () => window.removeEventListener(OPEN_EVENT, fn)
}
