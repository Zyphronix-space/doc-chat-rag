import LegalLayout from './LegalLayout'

export default function CookiePolicy() {
  return (
    <LegalLayout title="Cookie Policy">
      <p>
        DocMind does not use cookies, and it does not use any analytics, advertising, or tracking technology of any
        kind. There is no cookie consent banner because there is nothing non-essential to consent to.
      </p>

      <h2>What the app uses instead</h2>
      <p>
        Two pieces of information are kept in your browser's local storage, not as cookies:
      </p>
      <ul>
        <li>
          <strong>Login session token.</strong> Strictly necessary so you stay signed in between page loads. It is
          never sent anywhere except this app's own backend, and it is removed when you log out.
        </li>
        <li>
          <strong>Theme preference.</strong> Remembers whether you last used light or dark mode. Purely cosmetic and
          never leaves your browser.
        </li>
      </ul>

      <h2>Third parties</h2>
      <p>
        The only outbound network call made on your behalf is to Google's Gemini API to generate chat answers, as
        described in the <a href="/privacy-policy">Privacy Policy</a>. That call does not set cookies in your
        browser.
      </p>

      <h2>Changes</h2>
      <p>
        If non-essential cookies, analytics, or tracking are ever added to this project, this page will be updated
        first, and a consent mechanism will be added before anything non-essential starts running.
      </p>
    </LegalLayout>
  )
}
