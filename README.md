# Langkah (graduate-job-seeker)

A demand-validation register of graduate programmes for final-year students in Malaysia first, Singapore second. Answer seven questions. See which **checked** programmes you are eligible for, when each window is, and what the process looks like. Leave an address if you want to hear when more programmes are checked.

This is a validation pilot, not a jobs marketplace. It does not apply for you, scrape careers sites, or score CVs.

## MVP (now)

In: profile → eligibility gate + transparent fit → checked-programme shortlist → calendar → waitlist capture (with consent) → session log.

Out until a later phase: full accounts, OAuth, scrapers, LLM matching, payments, employer dashboards, a second country as a product, and treating sample records as facts.

## SMART for this slice

- **Specific:** students in MY (and visitors from SG) can finish the seven questions and see only programmes we have checked against an employer page, unless they turn samples on.
- **Measurable:** 20 waitlist addresses from people who also submitted a profile, plus enough `/debug` session logs to see whether they opened a programme and the calendar.
- **Achievable:** thirteen checked MY programmes as of 2026-09-15 (including RHB’s Management Associate Program, Bank Negara’s Kijang Graduate Programme, and Accenture’s Talent Advancement Program; Maybank GMAP stayed a sample because the live employer page still did not publish a current apply window we were willing to treat as a fact).
- **Relevant:** prove demand for a register of windows, not a new jobs board.
- **Time-bound:** two weeks of facilitated sessions after this slice is live.

## How to run it

```bash
npm install
cp .env.example .env.local   # optional; see Capture below
npm run dev
```

Open the URL the command prints. Profile, the session log, and a copy of any waitlist address stay in `localStorage`. Waitlist and events are **also** posted to `/api/waitlist` and `/api/events` when the browser can reach the server.

```bash
npm run build
```

This is a Node server on Vercel, not a static `out/` folder.

## Where the data lives

`data/verified.ts` — programmes checked against an employer page. Empty fields stay empty. `checkedOn` is the date we last read the page.

`data/programs.ts` — sample records plus the verified slice. Samples stay off the default shortlist.

`data/taxonomy.ts` — cities, degree fields, sectors. The form, the seed and the scorer all read from here.

`types/index.ts` is the data model. `lib/fit.ts` is the eligibility gate and the four-part fit score. `lib/catalog.ts` is what the shortlist and calendar actually show. `lib/storage.ts` is the only module that touches `localStorage`. `CONTEXT.md` is the glossary. `docs/adr/` is why the tiny backend exists and why unverified rows stay caged.

## How to add a checked programme

1. Open the employer's own programme page (not a jobs-board listing).
2. Copy only what that page states: window, CGPA, cities, citizenship, field, stages, notes.
3. Add a record in `data/verified.ts` with `dataConfidence: 'verified'`, `sourceUrl` pointing at **that** page, and today's `checkedOn`. If the page published a calendar close date, set `closesOn` to that ISO date; otherwise leave it null.
4. If a field is not on the page, leave it empty or omit the constraint. Do not invent a July window because last year was July.

Leave a record as a sample if you have not checked it. Samples never appear until the student turns them on. The honesty banner stays on the default catalogue until samples are gone.

## Capture (waitlist and events)

Set `DATABASE_URL` to a Postgres connection string (Neon on Vercel is the intended host). Without it, this machine writes `.data/capture.json`.

Set `CAPTURE_ADMIN_SECRET` so you can read `/api/capture` (Bearer token, or the Session log page). Public routes do not return emails.

Waitlist POST requires a consent tick, a plausible address, and an empty honeypot field. Events on the server drop email and CGPA. Consent version is `CONSENT_VERSION` in `lib/config.ts` (currently `2026-09-15-v2`). Copy for students is on `/privacy/`.

## Return visits

The seven answers still live in the browser. After a consented waitlist join we also store that profile on the server so we can email a copy of the checked shortlist and a one-time link (`/return/<token>/`) that restores those answers on another phone. The email does not include CGPA. The link expires in seven days and cannot be reused.

`/return/` will send another link without saying whether the address is on the list. `/delete/` is the same pattern for erasing the address and the stored answers.

Set `RESEND_API_KEY` and `RETURN_FROM_EMAIL` to actually send. Without them, the operator dump at `/api/capture` still stores the outbound body (including the link) so you can forward it during the pilot. A Monday cron at `/api/cron/reminders/` writes when a saved seasonal window is opening soon or in its last month; it needs `CRON_SECRET`. Rolling programmes are skipped so year-round schemes do not spam every week.

## How to read `/debug` after a session

1. Walk the student through the product as they would use it.
2. Open `/debug/` on the same browser.
3. Copy the event log and the local waitlist. Paste both into your session notes.
4. If capture is configured, load the server copy with the operator secret.
5. Use **Clear everything stored here** before handing the device to the next student.

Events you should expect if the session was used properly:

| type | when |
|---|---|
| `profile_submitted` | they submitted the seven questions |
| `shortlist_viewed` | they landed on `/shortlist` |
| `program_detail_opened` | they opened a programme |
| `filter_used` | they toggled a sector, country, window chip, or samples |
| `calendar_viewed` | they opened `/calendar` |
| `waitlist_joined` | they left an address on the shortlist |
| `return_visit` | they opened an emailed shortlist link |
| `waitlist_deleted` | they confirmed a deletion link |

The JSON is the source of truth. The readable list above it is just for scanning.

## Fit score

The number on each eligible row is a transparent sum of four fixed weights: field alignment (0–35), CGPA headroom (0–20), location fit (0–25) and sector interest (0–20). It is not a forecast of whether anyone will be hired. Expand any score to read the four sentences that produced it.

The working name is in `lib/config.ts`.

## Tests

```bash
npm test          # Vitest: eligibility, fit, windows, catalog, capture sanitise
npm run typecheck
```

The Playwright harness still lives in `verify/`. It talks to a running build, not to `next dev`:

```bash
npm run build && npm start -- -p 4173
# in another terminal
cd verify && npm install && npx playwright install chromium
node verify.mjs --base-url http://127.0.0.1:4173 --out ../verify-out
```

GitHub Actions runs typecheck, unit tests, a production build, and the harness on every pull request. Opening a PR is also what gives you a Vercel preview URL.

## Sentry

Set `SENTRY_DSN` on Vercel (Production and Preview) when you want API failures on `/api/waitlist`, `/api/events`, and `/api/capture` to show up in Sentry. Without it, those routes still return JSON errors and log to the host. We do not send email or CGPA to Sentry.

## Monthly window audit

The product is window maintenance. Once a month:

```bash
npm run audit:windows
```

That prints every verified row, how many days since `checkedOn`, and the source URL. Open each URL. If the window, CGPA or stages moved, edit `data/verified.ts` and set `checkedOn` to today. If the page 404s, cage the row as a sample rather than guessing. Rows older than 32 days are marked `DUE`.

Verified programme pages are in `/sitemap.xml` and are indexed. Sample pages are `noindex`.


