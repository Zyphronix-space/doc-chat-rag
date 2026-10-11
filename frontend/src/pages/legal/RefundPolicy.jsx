import { Link } from 'react-router-dom'
import LegalLayout, { ContactEmail } from './LegalLayout'

export default function RefundPolicy() {
  return (
    <LegalLayout
      title="Refund Policy"
      summary={
        <p>
          <strong>DocMind is free.</strong> There are no paid plans, subscriptions, trials or in-app purchases, and DocMind
          never asks for card or payment details, so there’s nothing to refund.
        </p>
      }
    >
      <h2 id="current">Current position</h2>
      <ul>
        <li>No part of DocMind is paid, and no payment system is connected to it.</li>
        <li>Nothing renews automatically and there’s nothing to cancel. You can stop using DocMind or delete your account at any time.</li>
        <li>
          If anyone asks you to pay for DocMind, it isn’t us. Please tell us at <ContactEmail />.
        </li>
      </ul>

      <h2 id="future">If paid features are introduced</h2>
      <p>
        We won’t charge anyone without first publishing pricing, renewal and cancellation terms and a full refund policy on
        this page, and asking for your explicit agreement before any payment. Free features you already use won’t start
        charging silently. Any refund rights you have under consumer law where you live would apply as well.
      </p>

      <h2 id="contact">Questions</h2>
      <p>
        Email <ContactEmail /> or use the <Link to="/contact">contact page</Link>.
      </p>
    </LegalLayout>
  )
}
