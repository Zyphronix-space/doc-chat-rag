import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Client-side navigation keeps the old scroll position by default, so a new
// page could open halfway down. Hash links (/#faq) handle their own scrolling.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}
