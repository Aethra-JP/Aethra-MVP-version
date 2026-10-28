// Everything shown on the landing page lives here, so you can edit the text without touching the layout.
// TODO (you): add your own details here later (team story, pricing, screenshots, testimonials, social links).
export const landing = {
  hero: {
    title: 'Know your business numbers, without being a data expert.',
    accent: 'business numbers',
    sub: 'Upload your sales file. Aethra reads it, explains what happened, forecasts what is next and tells you what to do, in English, Hindi or Hinglish.',
    primary: 'Get started free',
    secondary: 'Log in',
    note: 'Free to start. Works with Excel, CSV, Tally and GST files.',
  },
  trust: [
    ['Free to start', 'No card needed to try it'],
    ['Your files, your language', 'English, Hindi and Hinglish'],
    ['Numbers you can check', 'Every figure shows how it was calculated'],
  ],
  features: [
    { icon: 'file', title: 'Reads messy files for you', text: 'Title rows, rupee signs, Indian commas, mixed date styles, Excel sheets, Tally and GST exports. Aethra cleans them and tells you exactly what it changed.' },
    { icon: 'chart', title: 'Reports only when you ask', text: 'Pick what you want: what happened, why it happened, or what to do next. Nothing runs, and nothing is shown, until you choose it.' },
    { icon: 'target', title: 'Forecasts tested on your own data', text: 'Aethra tries several forecast models on your past months, shows which fits best, and warns you when the data is too short or too bumpy to trust.' },
    { icon: 'chat', title: 'Ask in your own language', text: 'Chat with your numbers in English, Hindi or Hinglish. Answers come from your file, calculated by code, then explained in plain words.' },
    { icon: 'rupee', title: 'Actions with rupee estimates', text: 'Each suggestion says how its estimate was made. Upload next month and check whether it worked.' },
    { icon: 'shield', title: 'Numbers you can verify', text: 'Every figure has a "How was this calculated?" button showing the formula and the columns used. The AI explains the results; it never does the maths.' },
  ],
  india: {
    title: 'Made for how Indian businesses work',
    points: ['Tally and GST sales files', 'Rupees in lakh and crore', 'April to March financial year', 'Festival and wedding seasons built into advice', 'Hindi and Hinglish'],
  },
  steps: [
    { title: 'Upload your file', text: 'A sales, expense or stock file from Excel, Tally or your billing software.' },
    { title: 'Choose what to see', text: 'A summary, the reasons behind changes, a forecast, or a list of actions.' },
    { title: 'Act and compare', text: 'Follow the suggestions, upload next month, and see what moved.' },
  ],
  audiences: ['Retail shops', 'Wholesalers and distributors', 'Small manufacturers', 'Food and sweets sellers', 'Online sellers', 'Service businesses'],
  faqs: [
    ['Do I need to know data analysis?', 'No. Aethra explains everything in plain language and shows its working only if you want to see it.'],
    ['Which files work?', 'CSV and Excel (.xlsx) files, Tally day book exports and GST sales files. If you have an old .xls file, save it as .xlsx first.'],
    ['Is it free?', 'It is free to use right now. We may add paid plans for advanced features in the future.'],
    ['Who can see my data?', 'Your files are kept in your own business space, linked to your login. Other users cannot open them.'],
    ['Does it replace my accountant?', 'No. Aethra helps you understand your numbers and plan. It is not tax, legal or financial advice.'],
  ],
  cta: { title: 'Upload last month\'s file and see your report', sub: 'It takes about two minutes.' },
}
