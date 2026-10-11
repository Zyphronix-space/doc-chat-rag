// Single source of truth for business identity, limits, and policy facts
// used across the public site, the legal pages, and in-app notices.
//
// Anything set to `null` is information only the owner can supply. The UI
// renders it as a visible "to be provided" marker instead of inventing a
// value, and docs/OWNER_ACTIONS.md lists every one of them. Fill these in
// before publishing the legal pages to real users.

export const BUSINESS = {
  productName: 'DocMind',
  // The person legally responsible for DocMind: an individual, not a
  // registered company (as stated in the project's earlier legal pages).
  operatorName: 'Stephan Wasalathanthrige',
  operatorDescription: 'an individual student portfolio project, not a registered company',
  // Where the operator is based; also the governing law in the Terms.
  country: 'Sri Lanka', // owner to confirm
  postalAddress: null, // only if you choose / are required to publish one
  // The address the earlier legal pages already published. A dedicated
  // project address is recommended (docs/OWNER_ACTIONS.md).
  supportEmail: 'stephanwasalathanthrige@gmail.com',
  privacyEmail: 'stephanwasalathanthrige@gmail.com',
}

export const POLICY = {
  // Bump TERMS_VERSION (here AND backend TERMS_VERSION) when the Terms change
  // materially; new signups record the version they accepted.
  termsVersion: '2026-10-11',
  lastUpdated: '11 October 2026',
  minimumAge: 18,
}

export const LIMITS = {
  // Mirrors the backend's MAX_FILE_SIZE_MB on this deployment. Vercel caps
  // request bodies at 4.5 MB, so the production backend is set to 4.
  maxUploadMb: Number(import.meta.env.VITE_MAX_UPLOAD_MB || 4),
  formats: ['PDF', 'TXT', 'Markdown'],
  resetLinkMinutes: 30,
  sessionHours: 2,
}

// Third parties that receive personal data, as actually wired up in this
// codebase. Keep in sync with docs/THIRD_PARTY_AUDIT.md.
export const PROCESSORS = [
  {
    name: 'Vercel Inc.',
    role: 'Hosts the website and runs the DocMind API.',
    data: 'Every request, including your IP address, browser user agent and the page or API path. Uploaded files and questions pass through it on their way to the database and AI provider.',
    location: 'Global edge network; the API runs in Singapore (sin1).',
    retention: 'Request logs are kept for 1 hour on the current plan.',
  },
  {
    name: 'PingCAP (TiDB Cloud)',
    role: 'The database: accounts, documents, extracted text, embeddings, conversations.',
    data: 'Everything listed under "What we store".',
    location: 'AWS, Singapore region (ap-southeast-1).',
    retention: 'Until you delete it. Automatic daily backups are kept for 1 day.',
  },
  {
    name: 'Google LLC (Gemini API)',
    role: 'Creates embeddings of your document text and generates answers.',
    data: 'The text of your documents (to create embeddings), your questions, and the document excerpts sent with each question.',
    location: 'Google infrastructure (may include the United States).',
    retention:
      'DocMind uses the free tier of the Gemini API. Under Google’s terms, free-tier inputs and outputs may be used to improve Google’s products and may be read by human reviewers.',
  },
]

export const LINKS = {
  geminiTerms: 'https://ai.google.dev/gemini-api/terms',
  googlePrivacy: 'https://policies.google.com/privacy',
  vercelPrivacy: 'https://vercel.com/legal/privacy-policy',
  tidbPrivacy: 'https://www.pingcap.com/privacy-policy/',
  sriLankaDpa: 'https://www.dpa.gov.lk/',
}
