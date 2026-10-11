import { Link } from 'react-router-dom'
import LegalLayout, { ContactEmail, Detail } from './LegalLayout'
import { BUSINESS, LINKS, LIMITS, POLICY } from '../../config/site'

const TOC = [
  ['service', 'The service'],
  ['eligibility', 'Who can use it'],
  ['account', 'Your account'],
  ['content', 'Your content'],
  ['acceptable-use', 'Acceptable use'],
  ['ai-output', 'AI-generated answers'],
  ['availability', 'Availability and changes'],
  ['ending', 'Ending your use'],
  ['liability', 'Disclaimers and liability'],
  ['law', 'Governing law'],
  ['changes', 'Changes to these terms'],
]

export default function TermsOfService() {
  return (
    <LegalLayout
      title="Terms of Service"
      toc={TOC}
      summary={
        <p>
          These terms are the agreement between you and <Detail value={BUSINESS.operatorName} label="operator name" /> (“we”)
          for using DocMind. You accept them by ticking the box when you create an account. In short: you must be{' '}
          {POLICY.minimumAge}+, your documents stay yours, check the AI’s answers before relying on them, and don’t misuse the
          service. Terms version {POLICY.termsVersion}.
        </p>
      }
    >
      <h2 id="service">1. The service</h2>
      <p>
        DocMind lets you upload documents (PDF, TXT and Markdown, up to {LIMITS.maxUploadMb} MB each), organize them, and ask
        questions that are answered by AI from those documents, with citations. It’s {BUSINESS.operatorDescription}, and
        it’s currently provided free of charge. How we handle your data is explained in the{' '}
        <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2 id="eligibility">2. Who can use DocMind</h2>
      <ul>
        <li>You must be at least {POLICY.minimumAge} years old.</li>
        <li>
          DocMind isn’t currently offered to people in the European Economic Area, the United Kingdom or Switzerland (see the
          Privacy Policy for why). Please don’t use it from those regions.
        </li>
        <li>You must be able to enter a binding agreement where you live.</li>
      </ul>

      <h2 id="account">3. Your account</h2>
      <ul>
        <li>Use an email address you control, and keep your password secret. One person per account.</li>
        <li>You’re responsible for activity on your account. Tell us promptly if you think someone else has accessed it.</li>
        <li>Log out on shared devices: your session is stored in the browser for up to {LIMITS.sessionHours} hours.</li>
      </ul>

      <h2 id="content">4. Your content</h2>
      <ul>
        <li>
          <strong>You keep ownership</strong> of the documents you upload and the questions you ask. You give us only the
          permission needed to run DocMind for you: storing your content, processing it (including sending it to our AI
          provider as the Privacy Policy describes), and showing it back to you. That permission ends when you delete the
          content, apart from the short backup period described in the Privacy Policy.
        </li>
        <li>
          <strong>Only upload what you have the right to use.</strong> That means you own it, have permission, or the law
          allows it. That covers copyright, confidentiality obligations (for example work or client documents), and other
          people’s personal information.
        </li>
        <li>
          <strong>Don’t upload sensitive or confidential material.</strong> DocMind uses the free tier of Google’s Gemini API,
          under which Google may use submitted content to improve its products and people may review it.
        </li>
      </ul>

      <h2 id="acceptable-use">5. Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>upload anything unlawful, or anything that infringes someone else’s rights;</li>
        <li>upload sexual content involving minors, or material that sexualizes, exploits or endangers children in any way;</li>
        <li>upload malware, or try to break, overload, probe or get around DocMind’s security or limits;</li>
        <li>access, or try to access, another person’s account or data;</li>
        <li>
          use DocMind in breach of Google’s{' '}
          <a href={LINKS.geminiTerms} target="_blank" rel="noreferrer">Gemini API terms</a> and its prohibited-use policy, for
          example to generate harmful content;
        </li>
        <li>scrape the service, resell it, or use it to build a competing AI dataset or model.</li>
      </ul>

      <h2 id="ai-output">6. AI-generated answers</h2>
      <p>
        Answers are generated automatically and <strong>can be incomplete, out of date or wrong</strong>, even when citations
        are shown. A citation tells you where an answer came from, not that the answer is correct. Check important answers
        against the cited passages and the original documents. DocMind isn’t professional (legal, medical, financial or
        other) advice, and it shouldn’t be your only basis for decisions that matter.
      </p>

      <h2 id="availability">7. Availability and changes to the service</h2>
      <p>
        DocMind is a free service that runs on free-tier infrastructure. It may be slow, rate-limited or unavailable at
        times, features may change, and we may stop offering it. If we plan to shut it down, we’ll try to give signed-in
        users reasonable notice so they can download their data. We don’t guarantee any particular uptime, and we don’t
        guarantee that stored data will never be lost, so keep your own copies of important documents.
      </p>

      <h2 id="ending">8. Ending your use</h2>
      <ul>
        <li>You can stop at any time and delete your account in Settings. That deletes your data as the Privacy Policy describes.</li>
        <li>
          We may suspend or close an account that breaks these terms, puts other users or the service at risk, or where the
          law requires it. Where it’s reasonable and lawful, we’ll explain why and give you a chance to download your data.
        </li>
      </ul>

      <h2 id="liability">9. Disclaimers and limits of liability</h2>
      <p>
        DocMind is provided free, “as is” and “as available”. To the extent the law allows, we make no promises that it will
        be error-free, uninterrupted, or suitable for a particular purpose, and we aren’t liable for indirect or
        consequential losses, or for loss of data you didn’t keep a copy of. Nothing in these terms excludes or limits
        liability that can’t be excluded or limited by law, or takes away rights you have as a consumer that can’t be
        waived.
      </p>

      <h2 id="law">10. Governing law</h2>
      <p>
        These terms are governed by the laws of <Detail value={BUSINESS.country} label="country" />. If you’re a consumer,
        you also keep any protections given to you by the law of the country you live in. Before going to court, please
        contact us at <ContactEmail /> so we can try to resolve the issue.
      </p>

      <h2 id="changes">11. Changes to these terms</h2>
      <p>
        If we change these terms in a way that matters, we’ll update the version and date, and ask signed-in users to accept
        the new version before they continue. If you don’t accept, you can delete your account.
      </p>

      <p className="legal-note">These terms haven’t yet been reviewed by a lawyer.</p>
    </LegalLayout>
  )
}
