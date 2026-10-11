# Owner actions

Things only the owner, Stephan, can decide or provide. The code doesn't
invent any of them. Anything missing from `frontend/src/config/site.js`
shows on the site as an amber "[…: to be provided]" marker.

## Before inviting real users

- [ ] **Confirm the jurisdiction.** `BUSINESS.country` is `'Sri Lanka'` and
      is also the governing law in the Terms.
      - If confirmed, check which parts of the Personal Data Protection Act
        No. 9 of 2022 are in force. Sources conflict: dpa.gov.lk lists Parts
        I, II, III and VII as operative from 18 March 2025, while another
        source says Amendment Act No. 22 of 2025 changed those dates.
- [ ] **Dedicated contact address.** Support and privacy currently use the
      personal Gmail that the old legal pages already published. A
      project-only address, such as a free alias, keeps personal mail out
      of it. Set `supportEmail` and `privacyEmail` in `site.js`.
- [ ] **Password-reset email.** Production has no SMTP, so the Forgot
      Password page sends people to /contact.
      - Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and
        `SMTP_FROM` on the `docmind-api` Vercel project. Any provider's
        free SMTP tier works, as does a Gmail app password for very low
        volume.
      - Then add the provider to `docs/THIRD_PARTY_AUDIT.md` and to
        `PROCESSORS`.
- [ ] **Legal review.** The Privacy Policy, Terms, Cookie Policy and Refund
      Policy were written to match the code exactly, but a lawyer hasn't
      reviewed them.
- [ ] **Postal address.** `BUSINESS.postalAddress` is `null` and isn't
      displayed. Publish one only if you choose to, or if the law requires
      it.

## Product decisions on hold

- **Under-18 users (students).** This isn't possible on the Gemini API: its
  terms require users to be 18+ and forbid apps likely to be used by
  minors. The app is 18+ for now. Allowing minors would need all of:
  - a different AI provider whose terms allow it;
  - a parental-consent flow;
  - revised policies.
- **Paid Gemini tier.** It would remove the "Google may train on / humans
  may review your content" caveat and the EEA/UK/Switzerland exclusion.
  After switching, update `PROCESSORS`, the Privacy Policy, the Terms, the
  FAQ and the upload notice, and bump `TERMS_VERSION` in both
  `frontend/src/config/site.js` and the backend env.
- **Upload limit.** Production is 4 MB (`MAX_FILE_SIZE_MB=4`) because
  Vercel caps request bodies at 4.5 MB. Larger files would need direct
  uploads to object storage.

## Each time the Terms change materially

1. Edit the policy pages and `POLICY.lastUpdated`.
2. Bump `POLICY.termsVersion` in `site.js` **and** the `TERMS_VERSION`
   env var on `docmind-api` to the same value.
3. Deploy the backend and frontend together (see `LAUNCH_READINESS.md`).
