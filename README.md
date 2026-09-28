# DocFlow AI

India-focused invoice OCR, extraction, validation, and Excel/CSV export.
Next.js (App Router) + Supabase, no separate backend — that architecture
call and "mock providers for now" were both explicit choices made before
this was built (see `/areas/docflow-ai.md`-equivalent context: this repo's
own history is the record now).

## What's actually built

- **Database** (`supabase/migrations/`, 6 files, run in order): every table
  from the spec, row-level security on all of them, a Postgres trigger that
  auto-creates an organization + owner profile on signup, and a
  `billing_orders` table that maps Razorpay orders back to organizations.
- **Backend API**: 11 authenticated, org-scoped endpoints (documents,
  jobs, exports, usage, billing checkout/webhook), all returning structured
  `{ error: { code, message } }` on failure.
- **Processing pipeline**: OCR → extraction → deterministic GST/GSTIN
  validation → duplicate detection → persistence → usage increment, with
  per-document failure isolation and no-crash handling for malformed
  extraction output (routes to manual review instead of crashing, per spec).
- **Frontend**: full auth flow (signup/login/forgot/reset via Supabase
  Auth), a dashboard with live stats, drag-and-drop multi-file upload with
  per-file status, a filterable documents/review table, a document review
  screen (preview + every field editable + Save/Approve/Reject/Reprocess),
  an export history page, and a billing page.
- **Marketing site**: a real landing page (hero → problem → how it works →
  features → example workflow → accuracy explanation → pricing → FAQ →
  CTA → footer, all ten spec'd sections), plus standalone `/pricing`,
  `/privacy`, and `/terms` pages. No fake stats, testimonials, or logos —
  the spec explicitly ruled those out and there's nothing here that needs
  fabricating to be true.
- **Billing architecture**: a real `BillingProvider` interface with a
  working Razorpay implementation (Orders API + HMAC signature
  verification for both payment confirmation and webhooks) behind a
  service interface, exactly as the spec asked — but it only activates once
  you set `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`. Without those, the
  checkout route returns a clear 503, not a fake success. **No live payment
  integration was required for this MVP, so none is faked.**
- **17 passing unit tests**, verified by actually running `npm install`,
  `npx tsc --noEmit`, `npx vitest run`, and `npx next build` against this
  exact code before it was handed to you.

## What's mocked, and why that's not cheating

OCR and extraction vendors are undecided (your call) — `OCR_PROVIDER=mock`
and `EXTRACTION_PROVIDER=mock` are the defaults. The mock OCR provider
generates deterministic, clearly-labeled fake invoice text; the mock
extraction provider does **real regex parsing** of that text into the
schema, not hardcoded fixture JSON — so validation, duplicate detection,
and export all run against genuinely structured (if fake) data today.
Swapping in a real vendor means writing one class per interface
(`src/lib/services/ocr/`, `src/lib/services/extraction/`) and adding one
line to each factory; nothing else changes.

This is also the honest limit of what "verified" means here: without your
Supabase project and (later) real OCR/LLM/Razorpay keys, nothing has run
against a live document, a live signup, or a live payment. Type-checking,
building, and unit-testing the logic is not the same as integration-testing
it against real infrastructure — that step is yours to do once the project
is deployed.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project's values
```

### Database setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor (or via the Supabase CLI), run the six files in
   `supabase/migrations/` **in numeric order** — each one depends on
   objects created by an earlier one (RLS policies need `0001`'s tables,
   the storage policies need `0002`'s `current_org_id()` function).
3. In Supabase Auth settings, set **Site URL** to your app's URL (e.g.
   `http://localhost:3000` for local dev) and add `/auth/callback` to the
   allowed redirect URLs — this is what makes signup-confirmation and
   password-reset email links work.
4. Copy the project URL, anon key, and service role key into `.env.local`.

### Local development

```bash
npm run dev      # http://localhost:3000
npm test          # 17 unit tests, no external services needed
npm run build     # production build
```

## Production deployment

**Frontend + API** (they're the same Next.js app — there's no separate
backend to deploy):
1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import it into [Vercel](https://vercel.com) (the natural fit for
   Next.js). Vercel's free Hobby tier is personal-use-only by its own
   terms — a commercial deployment needs **Pro**, currently $20/seat/month.
3. Set every variable from `.env.example` in Vercel's Environment
   Variables settings, including `NEXT_PUBLIC_SITE_URL` set to your real
   production domain (not localhost).
4. Deploy. Vercel builds and serves both the pages and the `/api/*` routes.

**Database + Storage**: already handled by the Supabase project from
"Database setup" above — Supabase *is* the production database and file
storage, there's no separate step. Move from Supabase's Free plan to
**Pro** (currently $25/month, includes a compute credit covering one
small instance) once you need projects that don't auto-pause after a week
of inactivity, which any real production app does.

**Domain**: point your domain at Vercel (their dashboard walks through the
DNS records), then update `NEXT_PUBLIC_SITE_URL` and the Supabase Auth
Site URL/redirect list to match.

**OCR / AI extraction configuration**: set `OCR_PROVIDER` and
`EXTRACTION_PROVIDER` away from `mock` once you've picked vendors, add
their credentials, and implement the two provider classes the factories
already point at (`src/lib/services/ocr/ocrService.ts`,
`src/lib/services/extraction/extractionService.ts`).

**Billing**: set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and
`RAZORPAY_WEBHOOK_SECRET` (from the Razorpay dashboard's webhook setup,
pointed at `/api/billing/webhook`) once you're ready to actually collect
payment. The billing page's "Upgrade" buttons already call the real
Orders API through this — what's still missing on top is wiring Razorpay's
client-side Checkout.js modal to the order id the API returns, which
needs a real key to test against.

**Logging**: Vercel's own function logs cover request-level errors out of
the box (`console.error` calls in this codebase, like the ones in
`apiError.ts`, show up there). Nothing beyond that is wired in.

**Error monitoring**: no Sentry (or equivalent) is integrated. If you want
alerting rather than just after-the-fact logs, that's the natural next
addition — it's a few lines in `apiError.ts`'s catch-all branch, not a
structural change.

## Required API keys / services

| Service | Required for | Free tier available |
|---|---|---|
| Supabase | Database, Auth, Storage — the whole backend | Yes, see cost notes below |
| Vercel (or any Next.js host) | Hosting the app | Personal use only — commercial use needs a paid plan |
| An OCR vendor (Google Document AI / AWS Textract / Azure Form Recognizer) | Real (non-mock) text extraction | Varies; Textract has a 90-day partial free tier |
| An LLM (Claude / GPT) | Real (non-mock) structured extraction | No permanent free production tier |
| Razorpay | Collecting real subscription payments | No cost until you process a payment (percentage fee only) |

## Estimated running cost

**These are estimates, not a quote** — grounded in each vendor's current
published pricing (checked September 2026) but built on stated assumptions
you should replace with your own once you have real invoices to measure:
~1 page per invoice, ~1,400 extraction tokens per invoice (Claude Haiku
4.5 input+output combined), ~400KB average file size.

| Volume/month | OCR (Textract AnalyzeExpense, $10/1K pages) | Extraction (Claude Haiku 4.5, $1/$5 per M tokens) | Fixed hosting (Vercel Pro + Supabase) | **Total** | Per document |
|---|---|---|---|---|---|
| 100 | $1.00 | $0.30 | $20 (Supabase still free at this size) | **~$21** | ~$0.21 |
| 1,000 | $10.00 | $3.00 | $20 (Supabase still free at this size) | **~$33** | ~$0.033 |
| 10,000 | $100.00 | $30.00 | $45 (Supabase Pro needed — file storage exceeds the free 1GB) | **~$175** | ~$0.018 |

Not included above, because it scales with *revenue* collected rather than
documents processed: Razorpay's standard domestic rate is 2% + 18% GST
(≈2.36% effective) on cards/netbanking/wallets, and 0% on UPI (government-
mandated) — so a Starter customer paying ₹1,499/month by UPI costs you
nothing in processing fees; the same by card costs roughly ₹35.

Numbers will move if you pick a different OCR/LLM vendor (Google Document
AI's Form Parser and Textract land at noticeably different price points,
for instance), or if real invoices run more or fewer pages/tokens than the
assumptions above.

## Known simplifications (flagged, not hidden)

- **Per-field confidence isn't tracked** — only one overall
  `extraction_confidence` per document. The review screen shows a
  document-level low-confidence banner instead of highlighting individual
  fields, because the mock extraction provider (and most real ones,
  without extra work) doesn't return per-field scores.
- **Usage increment is read-then-write**, not atomic — fine at MVP
  traffic, will race under concurrent processing. The comment in
  `documentProcessing.ts` marks exactly where to swap in a Postgres
  `increment_usage()` function.
- **CSV export is invoice-summary only** (one row per document) — line
  items and validation issues are one-to-many and stay in the Excel
  export's separate sheets.
- **Retention is a column, not a job.** `documents.retain_until` is set on
  upload; the scheduled deletion job that reads it doesn't exist yet.
- **No team invites yet.** `profiles.role` supports owner/admin/member and
  RLS is already written for multi-member orgs, but there's no UI to
  invite a second person into an existing organization.
- **Razorpay Checkout.js isn't mounted client-side.** The order-creation
  API call is real; the browser-side payment modal that consumes the
  returned order id needs a real `RAZORPAY_KEY_ID` to test against, so
  it's not wired into the billing page yet.
