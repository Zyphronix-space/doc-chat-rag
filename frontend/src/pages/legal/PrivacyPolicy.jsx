import LegalLayout from './LegalLayout'

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        DocMind is an individual student portfolio project built and operated by Stephan Wasalathanthrige. It is not
        a registered company. This page explains what information the app collects when you use it, why, and how
        it is handled.
      </p>

      <h2>Information collected</h2>
      <ul>
        <li>
          <strong>Account information.</strong> Your email address and a hashed password (never stored in plain
          text) when you register.
        </li>
        <li>
          <strong>Content you upload.</strong> The PDF, TXT, or Markdown documents you upload, and the text
          extracted from them, are stored so the app can search and chat against them.
        </li>
        <li>
          <strong>Chats and questions.</strong> Conversations, questions you ask, and the answers generated are
          stored so you can revisit them later.
        </li>
        <li>
          <strong>Basic usage data.</strong> Counts such as how many documents you have processed and how many
          questions you have asked, used only to show your own analytics inside the app.
        </li>
      </ul>

      <h2>Why this information is collected</h2>
      <p>
        Every item above exists to make the app work: authenticating you, storing the documents and collections you
        create, retrieving relevant passages, and generating grounded answers with citations. Nothing is collected
        for advertising or resold to third parties.
      </p>

      <h2>Third-party service: Google Gemini API</h2>
      <p>
        To generate chat answers and evaluate answer faithfulness, the relevant excerpts from your documents and
        your question text are sent to Google's Gemini API. Google's handling of that data is governed by Google's
        own terms and privacy policy, which are outside this project's control. No other third-party analytics,
        advertising, or tracking service is used.
      </p>

      <h2>Cookies and local storage</h2>
      <p>
        DocMind does not use cookies. It stores your login session token in your browser's local storage so you
        stay signed in between visits, and it may remember your light/dark theme preference the same way. Neither
        is used for tracking or shared with any third party; both stay on your device and are cleared when you log
        out or clear your browser's site data.
      </p>

      <h2>Data retention</h2>
      <p>
        Your account, documents, and conversations are kept until you delete them or ask for your account to be
        removed. There is no automatic deletion schedule configured for this project.
      </p>

      <h2>Data security</h2>
      <p>
        Passwords are hashed with bcrypt and never stored or logged in plain text. Access to documents and chats is
        restricted to the account that created them. As a student project, this app has not undergone a formal,
        independent security audit, and no guarantee of absolute security is made.
      </p>

      <h2>Data sharing</h2>
      <p>
        Your data is not sold or shared with third parties for marketing. The only outbound sharing is the Gemini
        API call described above, which is required for the app's core chat feature to function.
      </p>

      <h2>Your rights</h2>
      <p>
        You can request access to, correction of, or deletion of your personal data and uploaded content at any
        time by contacting the address below. Because this is a demo project, some requests may be handled by
        directly deleting your account rather than through an automated self-service flow.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data can be sent to Stephan Wasalathanthrige at{' '}
        <a href="mailto:stephanwasalathanthrige@gmail.com">stephanwasalathanthrige@gmail.com</a>.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        This policy may be updated as the project changes. Material changes will be reflected by updating this
        page.
      </p>

      <p className="legal-note">
        This project has not been reviewed by a lawyer. It is a portfolio application built for demonstration
        purposes and should not be treated as a fully compliant commercial data-processing service.
      </p>
    </LegalLayout>
  )
}
