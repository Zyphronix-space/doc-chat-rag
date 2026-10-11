import { Link, Outlet } from 'react-router-dom'
import GlassNavbar from '../glass/GlassNavbar'
import BrandMark from '../marketing/BrandMark'
import { useSmoothScroll } from '../marketing/useSmoothScroll'
import { openCookieSettings } from '../../lib/consent'
import { BUSINESS } from '../../config/site'

const footerLink = 'text-gray-700 hover:text-accent-700 hover:underline dark:text-gray-300 dark:hover:text-accent-300'

export default function PublicLayout() {
  useSmoothScroll()

  return (
    <div className="min-h-screen flex flex-col app-bg text-gray-900 dark:text-gray-100">
      <a href="#main" className="skip-link">
        Skip to main content
      </a>
      <GlassNavbar />
      <main id="main" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[var(--glass-border)] text-sm">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 rounded-md">
              <BrandMark size={28} />
              <span className="font-semibold">DocMind</span>
            </Link>
            <p className="mt-3 text-gray-700 dark:text-gray-300">
              Ask questions about your own documents and get answers that show the page they came from.
            </p>
          </div>

          <nav aria-labelledby="footer-product">
            <h2 id="footer-product" className="font-semibold">
              Product
            </h2>
            <ul className="mt-3 space-y-2">
              <li><Link to="/#how-it-works" className={footerLink}>How it works</Link></li>
              <li><Link to="/features" className={footerLink}>All features</Link></li>
              <li><Link to="/#faq" className={footerLink}>FAQ</Link></li>
              <li><Link to="/signup" className={footerLink}>Create an account</Link></li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="font-semibold">
              Legal
            </h2>
            <ul className="mt-3 space-y-2">
              <li><Link to="/privacy" className={footerLink}>Privacy Policy</Link></li>
              <li><Link to="/terms" className={footerLink}>Terms of Service</Link></li>
              <li><Link to="/refunds" className={footerLink}>Refund Policy</Link></li>
              <li><Link to="/cookies" className={footerLink}>Cookie Policy</Link></li>
              <li>
                <button type="button" onClick={openCookieSettings} className={footerLink}>
                  Cookie settings
                </button>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-help">
            <h2 id="footer-help" className="font-semibold">
              Help
            </h2>
            <ul className="mt-3 space-y-2">
              <li><Link to="/contact" className={footerLink}>Contact & privacy requests</Link></li>
              <li><Link to="/privacy#your-rights" className={footerLink}>Your data rights</Link></li>
              <li><Link to="/login" className={footerLink}>Log in</Link></li>
            </ul>
          </nav>
        </div>
        <p className="border-t border-[var(--glass-border)] px-4 py-5 text-center text-xs text-gray-700 dark:text-gray-300">
          © {new Date().getFullYear()} {BUSINESS.operatorName || BUSINESS.productName}. DocMind is an independent
          project. It is not affiliated with Google, Vercel or PingCAP.
        </p>
      </footer>
    </div>
  )
}
