import { Link } from 'react-router-dom'
import LegalLayout, { ContactEmail, Detail } from './LegalLayout'
import { BUSINESS, LINKS, LIMITS, POLICY, PROCESSORS } from '../../config/site'
import { openCookieSettings } from '../../lib/consent'

const TOC = [
  ['who', 'Who is responsible'],
  ['collect', 'What we collect'],
  ['why', 'Why we use it'],
  ['ai', 'AI processing (Google Gemini)'],
  ['sharing', 'Who receives your data'],
  ['transfers', 'Where your data goes'],
  ['retention', 'How long we keep it'],
  ['security', 'How it’s protected'],
  ['your-rights', 'Your rights'],
  ['children', 'Children'],
  ['others', 'Other people’s information'],
  ['changes', 'Changes to this policy'],
]

export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      toc={TOC}
      summary={
        <>
          <p className="font-semibold">The short version</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              We collect your email, a scrambled (hashed) password, and whatever documents and questions you give
              DocMind.
            </li>
            <li>
              To answer questions, your document text and questions are sent to Google’s Gemini API on its{' '}
              <strong>free tier</strong>, where Google may use them to improve its products and people may review them.
              Don’t upload confidential or sensitive information.
            </li>
            <li>No ads, no analytics, no tracking cookies, and we never sell data.</li>
            <li>You can download your data or delete your account from Settings at any time.</li>
          </ul>
        </>
      }
    >
      <h2 id="who">1. Who is responsible for your data</h2>
      <p>
        DocMind is run by <Detail value={BUSINESS.operatorName} label="operator name" />, {BUSINESS.operatorDescription}
        , based in <Detail value={BUSINESS.country} label="country" />. In this policy “we” means that person. We decide
        how your personal data is used, which makes us the “controller” (in Sri Lanka’s Personal Data Protection Act No.
        9 of 2022, and in similar laws elsewhere).
      </p>
      <p>
        Privacy questions and requests: <ContactEmail kind="privacy" />. See also the{' '}
        <Link to="/contact">contact page</Link>.
      </p>

      <h2 id="collect">2. What we collect</h2>
      <h3>Information you give us</h3>
      <ul>
        <li>
          <strong>Account details:</strong> your email address and your password. The password is stored only as a
          bcrypt hash, a one-way scramble we can’t reverse. We also record the version and time at which you accepted
          the Terms of Service (which includes confirming you’re {POLICY.minimumAge} or older).
        </li>
        <li>
          <strong>Documents:</strong> the files you upload (PDF, TXT, Markdown), the file names, the text extracted from
          them, the short passages that text is split into, and an “embedding” for each passage (a list of numbers that
          lets DocMind find passages by meaning).
        </li>
        <li>
          <strong>Your use of the workspace:</strong> collections you create, conversations, the questions you ask, the
          answers generated, which passages each answer cited, and any evaluation test questions you write.
        </li>
        <li>
          <strong>Messages you send us</strong>, if you email us.
        </li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li>
          <strong>Request logs:</strong> our host (Vercel) records basic details of each request, such as your IP
          address, browser user agent, the page or API path, and the time. They’re kept for 1 hour on our current plan.
          DocMind’s own code doesn’t log your documents, questions or answers.
        </li>
        <li>
          <strong>Rate limiting:</strong> to slow down password guessing, the server briefly keeps a count of sign-in,
          sign-up and password-reset attempts per IP address, in memory only. Counts reset within a minute, or whenever
          the server restarts.
        </li>
        <li>
          <strong>Browser storage:</strong> your sign-in token, your cookie choice and (only if you allow it) your
          theme. See the <Link to="/cookies">Cookie Policy</Link>.
        </li>
      </ul>
      <h3>What we don’t collect</h3>
      <p>
        We don’t collect your name, phone number, location or payment details. We don’t use analytics, advertising,
        session recording or tracking cookies.
      </p>

      <h2 id="why">3. Why we use it, and on what basis</h2>
      <div className="table-wrap" role="region" aria-label="Why we use your data, and on what basis" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">Purpose</th>
              <th scope="col">Data used</th>
              <th scope="col">Basis</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Creating your account and signing you in</td>
              <td>Email, password hash, sign-in token</td>
              <td>Needed to provide the service you asked for</td>
            </tr>
            <tr>
              <td>Storing, searching and answering questions about your documents</td>
              <td>Documents, extracted text, embeddings, questions, answers</td>
              <td>Needed to provide the service you asked for</td>
            </tr>
            <tr>
              <td>Keeping the service secure and preventing abuse</td>
              <td>Request logs, rate-limit counts</td>
              <td>Our legitimate interest in a secure service</td>
            </tr>
            <tr>
              <td>Recording that you accepted the Terms</td>
              <td>Terms version and time</td>
              <td>Needed to provide the service, and to show what you agreed to</td>
            </tr>
            <tr>
              <td>Remembering your theme</td>
              <td>Theme setting in your browser</td>
              <td>Your consent, which you can withdraw at any time</td>
            </tr>
            <tr>
              <td>Answering your messages and requests</td>
              <td>Your email and message</td>
              <td>Handling your request, and any legal obligation</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        We don’t use your data for advertising, we don’t sell it, and we don’t make automated decisions about you that
        have legal or similarly significant effects.
      </p>

      <h2 id="ai">4. AI processing (Google Gemini)</h2>
      <p>DocMind uses the Google Gemini API in two ways:</p>
      <ul>
        <li>When you upload a document, the text of each passage is sent to Gemini to create its embedding.</li>
        <li>
          When you ask a question, the question is sent to Gemini to be embedded. Then the question, together with the
          most relevant passages from the documents you picked, is sent to Gemini to write the answer.
        </li>
      </ul>
      <p>
        <strong>DocMind uses Gemini’s free (“unpaid”) tier.</strong> Under Google’s{' '}
        <a href={LINKS.geminiTerms} target="_blank" rel="noreferrer">
          Gemini API Additional Terms of Service
        </a>
        , Google uses content sent to its unpaid services, and the responses, to provide, improve and develop Google
        products and machine-learning technologies, and human reviewers may read and annotate it. Google asks that
        sensitive, confidential or personal information not be submitted to the unpaid services. That’s why we ask you
        not to upload such material. Google’s handling of this data is covered by the{' '}
        <a href={LINKS.googlePrivacy} target="_blank" rel="noreferrer">
          Google Privacy Policy
        </a>
        .
      </p>
      <p>
        <strong>DocMind itself doesn’t train any AI model</strong> on your data. Google’s use of free-tier data is
        described above, and we can’t switch it off while DocMind uses the free tier.
      </p>

      <h2 id="sharing">5. Who receives your data</h2>
      <p>
        We use these service providers to run DocMind. They process data on our behalf, or under their own terms where
        noted. We don’t share your data with anyone else, except where the law requires us to.
      </p>
      <div className="table-wrap" role="region" aria-label="Who receives your data" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">Provider</th>
              <th scope="col">What for</th>
              <th scope="col">Data</th>
              <th scope="col">Where</th>
              <th scope="col">Retention</th>
            </tr>
          </thead>
          <tbody>
            {PROCESSORS.map((p) => (
              <tr key={p.name}>
                <th scope="row">{p.name}</th>
                <td>{p.role}</td>
                <td>{p.data}</td>
                <td>{p.location}</td>
                <td>{p.retention}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        Provider policies:{' '}
        <a href={LINKS.vercelPrivacy} target="_blank" rel="noreferrer">
          Vercel
        </a>
        ,{' '}
        <a href={LINKS.tidbPrivacy} target="_blank" rel="noreferrer">
          PingCAP / TiDB Cloud
        </a>
        ,{' '}
        <a href={LINKS.googlePrivacy} target="_blank" rel="noreferrer">
          Google
        </a>
        .
      </p>

      <h2 id="transfers">6. Where your data goes</h2>
      <p>
        Your stored data is kept in Singapore (TiDB Cloud on AWS), and the DocMind API runs in Singapore. Google may
        process Gemini requests in other countries, including the United States, and Vercel serves the website from a
        global network. So your data is processed outside your own country. We rely on these providers’ contractual and
        security commitments to protect it in transit and at rest.
      </p>
      <p>
        <strong>EEA, UK and Switzerland:</strong> DocMind isn’t currently offered to people in these regions, because
        Google only allows its paid Gemini services in apps made available there.
      </p>

      <h2 id="retention">7. How long we keep it</h2>
      <ul>
        <li>
          <strong>Your account:</strong> until you delete it.
        </li>
        <li>
          <strong>Documents, extracted text and embeddings:</strong> until you delete the document or your account.
          Deleting a document removes all three.
        </li>
        <li>
          <strong>Conversations, answers and citations:</strong> until you delete the conversation or your account.
        </li>
        <li>
          <strong>Password-reset links:</strong> expire after {LIMITS.resetLinkMinutes} minutes and work only once. We
          store only a hash of each link.
        </li>
        <li>
          <strong>Request logs at our host:</strong> 1 hour.
        </li>
        <li>
          <strong>Database backups:</strong> our database provider takes an automatic backup once a day and keeps it for
          1 day. Data you delete can therefore remain in a backup for up to about 2 days before it’s gone for good.
        </li>
        <li>
          <strong>Data held by Google</strong> from free-tier Gemini requests: kept under Google’s own terms and
          policies (see section 4). We can’t delete it on your behalf.
        </li>
        <li>
          <strong>Emails you send us:</strong> as long as needed to deal with your request.
        </li>
      </ul>

      <h2 id="security">8. How your data is protected</h2>
      <ul>
        <li>All traffic uses HTTPS, and the connection to the database uses TLS.</li>
        <li>Passwords are stored as bcrypt hashes. Password-reset links are stored only as SHA-256 hashes.</li>
        <li>
          Every document, conversation and search is tied to your account and checked on the server. Another account
          asking for your data gets a “not found” response.
        </li>
        <li>Deleting your account requires your current password, so a stolen session alone can’t erase it.</li>
        <li>Sign-in sessions expire after {LIMITS.sessionHours} hours.</li>
      </ul>
      <p>
        No system is perfectly secure. One limitation you should know about: your sign-in token is kept in your
        browser’s local storage, so anyone who can use your browser profile, or any malicious browser extension, could
        use your session until it expires. Log out on shared computers. If we learn of a breach affecting your data,
        we’ll tell you and any authority we’re required to notify.
      </p>

      <h2 id="your-rights">9. Your rights</h2>
      <p>
        Depending on where you live (including under Sri Lanka’s Personal Data Protection Act), you may have the right
        to:
      </p>
      <ul>
        <li>
          <strong>Access and portability:</strong> use <em>Settings → Account → Download my data</em> for a copy of
          everything we store about you, in a machine-readable format.
        </li>
        <li>
          <strong>Correction:</strong> rename documents and conversations in the app. To change your email address,
          contact us.
        </li>
        <li>
          <strong>Deletion:</strong> delete individual documents and conversations, or your whole account under{' '}
          <em>Settings → Account → Delete account</em>. It takes effect immediately, apart from the backup window in
          section 7.
        </li>
        <li>
          <strong>Withdraw consent</strong> for optional browser storage at any time:{' '}
          <button type="button" onClick={openCookieSettings} className="underline text-accent-700 dark:text-accent-300">
            cookie settings
          </button>
          .
        </li>
        <li>
          <strong>Object to or restrict</strong> certain processing, and <strong>ask questions</strong> about how your
          data is used.
        </li>
        <li>
          <strong>Complain</strong> to a data protection authority. In Sri Lanka that’s the{' '}
          <a href={LINKS.sriLankaDpa} target="_blank" rel="noreferrer">
            Data Protection Authority of Sri Lanka
          </a>
          .
        </li>
      </ul>
      <p>
        For anything you can’t do in the app, or if you can’t sign in, email <ContactEmail kind="privacy" /> from the
        address on your account. We may ask you to confirm the request from that address before acting on it. We aim to
        reply within one month.
      </p>

      <h2 id="children">10. Children</h2>
      <p>
        DocMind is for adults. You must be {POLICY.minimumAge} or older to create an account. That’s our own rule, and
        our AI provider’s terms also forbid services aimed at or likely to be used by under-18s. We don’t knowingly
        collect children’s personal data. If we learn that an account belongs to someone under {POLICY.minimumAge},
        we’ll delete it. If you believe a child has an account, please contact us.
      </p>

      <h2 id="others">11. Information about other people in your documents</h2>
      <p>
        Documents can contain personal information about other people, including children. Only upload documents you
        have the right to share, and avoid documents with other people’s personal or sensitive information, especially
        given the free-tier AI processing described above. You’re responsible for having a lawful basis for any such
        information you upload. If you’re named in a document someone else uploaded, contact us and we’ll help where we
        can.
      </p>

      <h2 id="changes">12. Changes to this policy</h2>
      <p>
        If we change this policy, we’ll update the date at the top. If a change materially affects how your data is
        used, we’ll tell signed-in users before it takes effect.
      </p>

      <p className="legal-note">
        This policy describes how DocMind actually works as of the date above. It hasn’t yet been reviewed by a lawyer.
      </p>
    </LegalLayout>
  )
}
