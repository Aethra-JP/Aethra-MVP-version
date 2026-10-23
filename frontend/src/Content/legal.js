// Text of the five legal documents. Edit the wording here and it changes on the landing page and both Contact pages.
// A block is { h: heading (optional), p: paragraph }. The email address inside any paragraph becomes a clickable link.
export const LEGAL_VERSION = 'October 2026'
export const LEGAL_EMAIL = 'aethra.ai.team@gmail.com'

export const legalDocs = [
  {
    id: 'disclaimers',
    title: 'Legal and Disclaimers',
    meta: [],
    blocks: [
      { h: 'Business Information Disclaimer', p: "Aethra's reports, forecasts and suggested actions are for information and planning only. They are estimates based on the data you upload, and their accuracy depends on the quality of that data. They are not financial, tax, legal or accounting advice. Do not make major business decisions based only on Aethra's output." },
      { h: 'AI Disclaimer', p: "Explanations and chat answers are produced by large language models and may contain errors. Aethra calculates figures with code and shows how they were calculated, but files can be misread (for example a wrong column or date format). Verify important numbers before acting on them." },
      { h: 'Jurisdiction', p: 'All legal matters, disputes and suits arising from the use of Aethra are subject to the exclusive jurisdiction of the courts in Delhi, India. By using Aethra, you agree to this jurisdiction.' },
      { h: 'Data and Privacy', p: 'Aethra collects your name, email and the business data you upload to provide the service. It is stored with access controls so that other users cannot open your business\'s data. We do not sell your data. By signing up, you agree to our Privacy Policy and Terms of Service.' },
      { h: 'Questions', p: `Questions about these policies? Email ${LEGAL_EMAIL}.` },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    meta: ['Last updated: ' + LEGAL_VERSION, 'Jurisdiction: Delhi, India'],
    blocks: [
      { h: 'What we collect', p: 'Your name and email; your business name and type; the files you upload (and the cleaned copy we create); reports, forecasts and actions generated from them; chat history; documents you add; messages you send through the Contact page; and daily usage counts used to enforce fair-use limits.' },
      { h: 'How we use it', p: 'To run the platform, create your reports and forecasts, answer your questions, enforce usage limits, respond to your messages and keep the service secure.' },
      { h: 'Who processes your data', p: 'We use trusted providers to run Aethra: Supabase (database, sign-in and file storage), Vercel and Netlify (hosting), Groq (AI), and, only if you use document search, an embedding provider to make your documents searchable. If you choose Google sign-in, Google handles that login. Our website loads fonts from Google, which may receive your IP address. Authentication emails are sent through an email provider.' },
      { h: 'AI processing', p: 'To write explanations and chat answers, Aethra sends your questions and results calculated from your file to Groq. These results can include names that appear in your data, such as product or customer names. Your whole uploaded file is not sent. If you use document search, relevant parts of your documents are sent too. These providers handle data under their own terms.' },
      { h: 'Data security', p: 'Your data is stored with Supabase using access rules that stop other users from reading it, and uploaded files are kept in private storage. Passwords are handled by our sign-in provider and are never stored in plain text by us.' },
      { h: 'Data sharing', p: 'We do not sell or share your data, except with the providers above to deliver the service or where the law requires.' },
      { h: 'Keeping and deleting data', p: 'We keep your data until you delete it or ask us to. Usage counts and security logs may be kept for a limited time.' },
      { h: 'Your rights', p: `You may request access, correction or deletion of your data by emailing ${LEGAL_EMAIL}. Deletion requests are fulfilled within 30 days. We aim to handle personal data in line with applicable Indian law, including the Digital Personal Data Protection Act, 2023.` },
      { h: 'Children', p: 'Aethra is for people aged 18 and over.' },
      { h: 'Changes', p: 'If we change this policy, we will update the date above.' },
      { h: 'Contact', p: LEGAL_EMAIL },
    ],
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    meta: ['Last updated: ' + LEGAL_VERSION, 'Jurisdiction: Delhi, India', 'Governing law: Laws of India'],
    blocks: [
      { h: '1. Acceptance', p: 'By using Aethra, you agree to these Terms. If you disagree, do not use the platform.' },
      { h: '2. Eligibility', p: 'You must be at least 18 years of age to create an account.' },
      { h: '3. Your data', p: 'You keep ownership of the data you upload and the reports created from it. You are responsible for having the right to upload it, including any personal data of your customers or staff. Please do not upload data Aethra does not need, such as government ID numbers, bank account details or card numbers.' },
      { h: '4. Acceptable use', p: 'You agree not to reverse-engineer the platform, spam or abuse the AI, bypass usage limits, impersonate others, upload malicious files, or use Aethra for unlawful purposes.' },
      { h: '5. Information only', p: 'Reports, forecasts and suggestions are estimates for information and planning. They are not financial, tax, legal or accounting advice. Tally and GST file imports are best-effort, so please check the results.' },
      { h: '6. AI content', p: 'AI responses may contain errors. Independently verify important claims and numbers.' },
      { h: '7. Free service and limits', p: 'Aethra is currently free and has fair-use limits (such as daily report and chat limits and file size limits). We do not guarantee uninterrupted availability, and we may change, limit or discontinue features, including free ones.' },
      { h: '8. Intellectual property', p: 'The Aethra platform and brand are the intellectual property of Aethra.' },
      { h: '9. Termination', p: `We may suspend accounts that violate these Terms without notice. You can stop using Aethra at any time and ask us to delete your account by emailing ${LEGAL_EMAIL}.` },
      { h: '10. Limitation of liability', p: 'Aethra is not liable for indirect, incidental or consequential damages, including business losses, arising from the use of the platform or decisions made using its output.' },
      { h: '11. Changes', p: 'We may update these Terms. Continued use after an update means you accept it.' },
      { h: 'Contact', p: LEGAL_EMAIL },
    ],
  },
  {
    id: 'cookies',
    title: 'Cookie and Local Storage Policy',
    meta: ['Last updated: ' + LEGAL_VERSION, 'Jurisdiction: Delhi, India'],
    blocks: [
      { h: 'What we store in your browser', p: "Aethra does not set its own advertising or tracking cookies. To keep you logged in, our sign-in provider stores your session in your browser's local storage. We also store your preferences there: your chosen language, and the business and file you last selected." },
      { h: 'No tracking', p: 'We do not use advertising, analytics or third-party tracking tools.' },
      { h: 'Third parties', p: "Fonts are loaded from Google Fonts, and if you use Google sign-in, Google may set its own cookies on its own pages. Those are governed by Google's policies." },
      { h: 'Managing storage', p: 'You can clear this data any time in your browser settings. Clearing it will log you out and reset your preferences.' },
      { h: 'Consent', p: 'By creating an account and using Aethra, you consent to this essential storage.' },
      { h: 'Contact', p: LEGAL_EMAIL },
    ],
  },
  {
    id: 'refund',
    title: 'Refund Policy',
    meta: ['Last updated: ' + LEGAL_VERSION, 'Jurisdiction: Delhi, India'],
    blocks: [
      { h: 'Current plan', p: 'Aethra is free right now. No payment is taken, so no refund applies.' },
      { h: 'Future paid plans', p: 'If we introduce paid plans, we will publish their price and refund terms before you are charged, and they will apply only to those plans. We expect the same kinds of cases to be refundable as in our standard terms: duplicate or unauthorised charges, a verified technical failure that stops you using a paid feature for a long period, and similar billing errors. We do not expect to refund change of mind or non-use.' },
      { h: 'How to ask', p: `Email ${LEGAL_EMAIL} with your registered email and details of the issue.` },
      { h: 'Contact', p: LEGAL_EMAIL },
    ],
  },
]
