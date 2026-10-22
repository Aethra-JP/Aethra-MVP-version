# Aethra

AI business analysis for Indian small businesses. Owners upload a sales, expense or stock file (CSV, Excel, Tally or GST export) and get plain-language reports, forecasts, suggested actions and a chat that answers from their own numbers.

**Stack (all free tiers):** React + Vite on **Netlify** · Python **FastAPI** serverless on **Vercel** · **Supabase** (Postgres, Auth, Storage) · **Groq** (Llama) for explanations and chat · optional embeddings for document search.

```
Browser (React on Netlify)
   ├─ login, file upload ───────────► Supabase (Auth, Postgres, Storage)
   └─ /api/* (Netlify proxy) ───────► FastAPI (Vercel) ──► Supabase + Groq (+ embeddings)
GitHub Actions (daily) ─────────────► /api/cron/run  (alerts + keeps Supabase awake)
```

## The rules the product follows
1. **Python computes every number; the AI only explains.** Each figure is logged with its formula and columns ("How was this calculated?"). If an AI sentence contains a number that is not in the computed results, it is discarded and a plain summary is shown.
2. **Reports run only when asked** (summary, reasons, actions). Forecasting has its own page.
3. **Forecast models are tested on your own past data** (rolling backtests), then the best one is recommended, with honest warnings when history is short or models are tied.
4. **Everything is free now.** `workspaces.plan` and the `feature_flags` table exist so paid tiers can be switched on later without rewriting the app.

## What you need (keys and accounts)
| Item | Where to get it | Goes in |
|---|---|---|
| Supabase URL, anon key, service-role key | supabase.com > your project > Project Settings > API | frontend `.env` (URL + anon), backend env (URL + service-role) |
| Groq API key | console.groq.com | backend env `GROQ_API_KEY` |
| A random secret | any long random string | backend env `CRON_SECRET` and GitHub secret `CRON_SECRET` |
| SMTP details (for password-reset and confirmation emails) | Resend, Brevo or similar free tier | Supabase > Authentication > SMTP settings |
| Optional: Cloudflare account id + API token (or a Gemini key) | Cloudflare dashboard / Google AI Studio | backend env `EMBED_*` |
| Optional: Google OAuth client | Google Cloud console | Supabase > Authentication > Providers > Google |

**The Supabase service-role key is secret. Only the backend uses it. Never put it in the frontend or in Git.**

## Setup, step by step

### 1. Supabase
1. Create a project. Open **SQL Editor**, paste all of `supabase/schema.sql`, run it. (It creates tables, security rules, two private storage buckets and seed data.)
2. **Authentication > URL Configuration:** set *Site URL* to your Netlify URL, and add these *Redirect URLs*: `https://YOUR-SITE.netlify.app/**` and `http://localhost:5173/**`. Password reset and Google login will not work without this.
3. **Authentication > SMTP Settings:** turn on custom SMTP with your email provider. Supabase's built-in email sender is only meant for testing and allows very few emails per hour, so resets would fail once a few people try them.
4. Optional: enable the Google provider.

### 2. Run it locally first
```bash
# backend
cd backend
python -m venv .venv && source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env                                      # fill in the keys
uvicorn app.main:app --reload --port 8000 --env-file .env
# frontend (new terminal)
cd frontend
cp .env.example .env                                      # fill in the Supabase URL and anon key
npm install && npm run dev                                # opens http://localhost:5173 (proxies /api to port 8000)
```
Try it with the files in `sample_data/` (see TESTING.md).

### 3. Deploy the backend on Vercel
1. Push this repo to GitHub. In Vercel: *Add New > Project*, import it, set **Root Directory = `backend`**.
2. Add every variable from `backend/.env.example` under *Settings > Environment Variables*.
3. Deploy, then open `https://YOUR-BACKEND.vercel.app/api/health`. You should see `{"ok": true}`.
4. Vercel uses `requirements.txt` (lightweight, fits serverless size limits; forecasting offers 7 models). `requirements-full.txt` adds random forest, gradient boosting and SARIMA but may exceed Vercel's function size limit. If you want those, deploy the backend with the included `Dockerfile` on Render, Cloud Run or Fly.io instead. Check each host's current free-tier limits and sleep behaviour.

### 4. Deploy the frontend on Netlify
1. *Add new site > Import from Git.* Netlify reads `netlify.toml` (base `frontend`).
2. Edit `netlify.toml` and replace `YOUR-BACKEND.vercel.app` with your Vercel URL.
3. Add environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then deploy.
4. If long requests time out through Netlify's proxy, remove the `/api/*` redirect, set `VITE_API_URL=https://YOUR-BACKEND.vercel.app/api` in Netlify, and set `ALLOWED_ORIGINS` on the backend to your Netlify URL.
5. Set the Supabase *Site URL* (step 1.2) to this final URL.

### 5. Daily job (alerts + keeps the free database awake)
In GitHub: *Settings > Secrets and variables > Actions*, add `BACKEND_URL` (for example `https://YOUR-BACKEND.vercel.app`, no trailing slash) and `CRON_SECRET`. The workflow in `.github/workflows/daily.yml` runs every day; use *Run workflow* once to test. GitHub can pause scheduled workflows on repositories with no activity for a long time, so check it now and then.

### 6. Optional: document search, memory and knowledge base
1. Pick **one** provider and set `EMBED_PROVIDER` (`cloudflare` recommended for private documents: multilingual `@cf/baai/bge-m3`, 1024 dimensions; check its current limits and data policy yourself).
2. Set its keys. `EMBED_DIM` must match `vector(1024)` in `schema.sql` (if you change the model's size, change both and re-embed everything).
3. Run `cd backend && python scripts/seed_kb.py` once to load the shared glossary.
4. The provider HTTP calls are written from each provider's documented format but **were not run against the live APIs here**. Verify in testing.

## Project layout
```
supabase/schema.sql        tables, row level security, buckets, seed data
backend/app/services/      processor (cleaning), importers (Tally/GST), calc (audit log), analysis,
                           narrative (AI text + number guard), forecasting, chat_agent, embeddings
backend/app/routers/       API endpoints
backend/tests/             22 automated tests (run: cd backend && pytest)
frontend/src/              React app (pages, charts, Hindi/Hinglish labels)
sample_data/               messy sales, next-month file, Tally and GST samples
```

## Honest status
**Tested in the build environment:** data cleaning on messy files (title rows, ₹ and Indian commas, brackets, dd/mm/yyyy, Excel serial dates, totals, duplicates), Tally and GST samples, all analysis and forecasting logic, the number-checking guard, the chat tool loop with a simulated model, every API endpoint end to end against an in-memory stand-in for Supabase (22 tests, on pandas 2 and 3), and a successful production build of the frontend.

**Not tested (needs your keys and accounts, see TESTING.md):** real Supabase (auth emails, RLS, storage uploads, the `match_chunks` function), real Groq answers and tool calling, Vercel and Netlify deployments and timeouts, Google login, embedding providers, the GitHub schedule, and how the screens look and behave in a real browser. The Tally and GST importers are best-effort column mappings: test them with real exports from your customers.

**Known limits:** forecasts are time-series only (no tabular regression yet); scanned PDFs need OCR (not included); old `.xls` files must be saved as `.xlsx`; the interface labels are translated for navigation, sign-in and main buttons, while AI reports and chat answer in the language chosen; WhatsApp delivery is not built; billing is not built (by design).

## Turning on paid plans later
Set `workspaces.plan` to `pro` for paying customers, and set `min_plan = 'pro'` on rows in `feature_flags` (for example `predictive_model_picker`). The backend already checks these flags. Add a payment provider and a webhook that updates `plan`.
