import LegalLayout from './LegalLayout'
import { CATEGORIES, openCookieSettings } from '../../lib/consent'

export default function CookiePolicy() {
  return (
    <LegalLayout
      title="Cookie Policy"
      summary={
        <p>
          <strong>DocMind doesn’t set any cookies.</strong> It does keep a few items in your browser’s local storage,
          which privacy rules treat much like cookies. Only one is optional (remembering your theme), and it’s off
          unless you allow it. There are no analytics, advertising or tracking technologies of any kind.
        </p>
      }
    >
      <h2 id="what">What DocMind stores in your browser</h2>
      {CATEGORIES.map((c) => (
        <div key={c.id}>
          <h3>
            {c.label} {c.required ? '(always on)' : '(optional, off by default)'}
          </h3>
          <p>{c.description}</p>
          <div className="table-wrap" role="region" aria-label={`${c.label}: what is stored`} tabIndex={0}>
            <table>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Type</th>
                  <th scope="col">Purpose</th>
                  <th scope="col">How long</th>
                </tr>
              </thead>
              <tbody>
                {c.items.map((item) => (
                  <tr key={item.key}>
                    <td>
                      <code>{item.key}</code>
                    </td>
                    <td>{item.type}</td>
                    <td>{item.purpose}</td>
                    <td>{item.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <h2 id="third-parties">Third parties</h2>
      <ul>
        <li>
          DocMind loads no third-party scripts, analytics, advertising, social-media widgets or embedded content. Fonts
          are served from DocMind’s own domain, not from Google Fonts.
        </li>
        <li>
          Our host, Vercel, doesn’t set cookies when you visit DocMind. It does see your IP address and browser details
          for each request, as the Privacy Policy explains.
        </li>
        <li>
          The DocMind API talks to Google’s Gemini service from our server, not from your browser, so Google sets
          nothing in your browser through DocMind.
        </li>
      </ul>

      <h2 id="manage">Changing your choice</h2>
      <p>
        You can change or withdraw your choice at any time. Turning “Preferences” off deletes the stored theme straight
        away.
      </p>
      <p>
        <button
          type="button"
          onClick={openCookieSettings}
          className="rounded-full border border-gray-400 px-4 py-2 font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Open cookie settings
        </button>
      </p>
      <p>
        You can also clear site data in your browser settings. That logs you out and resets your cookie choice, so
        you’ll be asked again.
      </p>

      <p className="legal-note">
        If DocMind ever adds an optional technology (such as analytics), it will be listed here and stay off until you
        agree to it.
      </p>
    </LegalLayout>
  )
}
