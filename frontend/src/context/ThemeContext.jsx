import { createContext, useContext, useEffect, useState } from 'react'
import { hasConsent, subscribe } from '../lib/consent'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'doc_chat_rag_theme'

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getInitialTheme() {
  // A remembered choice is only read back if the visitor allowed
  // "preferences" storage (see lib/consent.js); otherwise follow the device.
  if (hasConsent('preferences')) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') return stored
    } catch {
      // storage unavailable
    }
  }
  return systemTheme()
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    if (hasConsent('preferences')) {
      try {
        localStorage.setItem(STORAGE_KEY, theme)
      } catch {
        // storage unavailable -- the theme still applies for this session
      }
    }
  }, [theme])

  // Granting consent later saves the current choice right away; withdrawing
  // it is handled in lib/consent.js, which deletes the stored key.
  useEffect(
    () =>
      subscribe(() => {
        if (hasConsent('preferences')) {
          try {
            localStorage.setItem(STORAGE_KEY, document.documentElement.classList.contains('dark') ? 'dark' : 'light')
          } catch {
            // ignore
          }
        }
      }),
    [],
  )

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
