# Testing checklist

Do these in order after setup. Files are in `sample_data/`. Tick each box; note anything that differs.

## A. Automated (backend logic)
- [ ] `cd backend && pip install -r requirements-dev.txt && pytest` shows all tests passing.

## B. Accounts and sign-in
- [ ] Sign up with email. A confirmation email arrives (if not: check custom SMTP in Supabase).
- [ ] After confirming, log in. Wrong password shows "That email and password do not match."
- [ ] Forgot password: email arrives, link opens "New password" page, new password works, old one does not.
- [ ] Google login (only if you enabled it).
- [ ] Log out, then open a page URL directly: you land on the login page.

## C. Business and upload
- [ ] Create a business on Home.
- [ ] Upload `messy_sales.csv`. Result says 2,639 rows, and the cleaning notes mention skipped title rows and a removed total row. Total is about ₹28.40 lakh.
- [ ] Upload `tally_daybook.csv` (choose "Tally export" or auto). Total is ₹73,200.
- [ ] Upload `gst_sales.csv`. Total is ₹35,000 (taxable value).
- [ ] Upload a file over 10 MB and a `.pdf` as data: you get a clear message, not a crash.
- [ ] Open the file in Supabase Storage: it sits under a folder named after the business id.

## D. Reports (each runs only when you click)
- [ ] "What happened" on `messy_sales.csv`: KPIs, month chart, top products/categories, a note that the last month is incomplete.
- [ ] Click "How was this calculated?" on a KPI: formula and columns appear.
- [ ] "Why it happened": changes between the last two complete months, unusual days, weekday pattern.
- [ ] "What to do": a few actions with ₹ estimates and the assumption written under each. They appear on the Action plan page.
- [ ] With `GROQ_API_KEY` set, the label says "AI explanation, numbers checked". Without it, "Plain summary". Try Hindi and Hinglish in the language box.
- [ ] Spot-check three numbers against the CSV in Excel.

## E. Forecast
- [ ] Model list shows lightweight models enabled; models needing more history show why they are disabled.
- [ ] Run "Same period last cycle", then "Compare all models". A ranking table and a plain verdict appear. "Run [best model]" works.
- [ ] Use `tally_daybook.csv`: short history, so you see a warning rather than a confident forecast.

## F. History across months
- [ ] Upload `october_2026_sales.csv` with period "October 2026". Home shows a history chart with two points.
- [ ] Run "What happened" on it: the result mentions change versus the previous upload (see the calculations list).
- [ ] On Action plan, click "Check progress" on an action: it compares totals between uploads.

## G. Chat
- [ ] Ask "What are my total sales?" The answer matches the Home total.
- [ ] Ask "Show sales by month as a chart": a chart appears.
- [ ] Ask something the data cannot answer (for example "What is my customer age?"): it says so instead of inventing.
- [ ] Ask in Hindi and in Hinglish.
- [ ] "How was this calculated?" on an answer lists the tool results.

## H. Documents and knowledge base (only if embeddings are on)
- [ ] Add a small PDF or TXT. Status becomes "Ready".
- [ ] In chat, ask about something written in the document. The answer uses it.
- [ ] Ask a glossary question such as "What is input tax credit?" (after `seed_kb.py`).
- [ ] With embeddings off, the Documents page says so clearly.

## I. Alerts and the daily job
- [ ] In GitHub, run the "Daily Aethra job" workflow manually. It succeeds (green).
- [ ] An alert appears after the job ("Time to upload..." or a change alert).

## J. Security
- [ ] Create a second user. They cannot see the first user's business, files or chats.
- [ ] Calling `/api/workspaces` without logging in returns 401.
- [ ] The service-role key is not present anywhere in the built frontend (search the Netlify deploy).

## K. Limits and failure behaviour
- [ ] Set `MAX_ANALYSES_PER_DAY=2` temporarily: the third report shows a friendly daily-limit message.
- [ ] Upload a messy file of your own. Note anything that is mis-read (wrong date order, wrong amount column) and send it back for the importer to be improved.
- [ ] Time a report on a large file. Note any host timeout.

## L. Browser and phone
- [ ] Use the app on a phone-sized screen: navigation scrolls, tables scroll sideways, nothing is cut off.
- [ ] Tab through the login page with the keyboard: focus is visible.
