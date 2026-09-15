# Langkah (graduate-job-seeker)

A demand-validation register of graduate programmes for final-year students in Malaysia first, Singapore second. Answer seven questions. See which **checked** programmes you are eligible for, when each window is, and what the process looks like. Leave an address if you want to hear when more programmes are checked.

This is a validation pilot, not a jobs marketplace. It does not apply for you, scrape careers sites, or score CVs.

## MVP (now)

In: profile → eligibility gate + transparent fit → checked-programme shortlist → calendar → waitlist capture (with consent) → session log.

Out until a later phase: accounts, magic-link return visits, scrapers, LLM matching, payments, employer dashboards, a second country as a product, and treating sample records as facts.

## SMART for this slice

- **Specific:** students in MY (and visitors from SG) can finish the seven questions and see only programmes we have checked against an employer page, unless they turn samples on.
- **Measurable:** 20 waitlist addresses from people who also submitted a profile, plus enough `/debug` session logs to see whether they opened a programme and the calendar.
- **Achievable:** seven checked MY programmes as of 2026-09-15 (not ten: the rest of the intended list did not have a page we were willing to treat as a fact).
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
3. Add a record in `data/verified.ts` with `dataConfidence: 'verified'`, `sourceUrl` pointing at **that** page, and today's `checkedOn`.
4. If a field is not on the page, leave it empty or omit the constraint. Do not invent a July window because last year was July.

Leave a record as a sample if you have not checked it. Samples never appear until the student turns them on. The honesty banner stays on the default catalogue until samples are gone.

## Capture (waitlist and events)

Set `DATABASE_URL` to a Postgres connection string (Neon on Vercel is the intended host). Without it, this machine writes `.data/capture.json`.

Set `CAPTURE_ADMIN_SECRET` so you can read `/api/capture` (Bearer token, or the Session log page). Public routes do not return emails.

Waitlist POST requires a consent tick, a plausible address, and an empty honeypot field. Events on the server drop email and CGPA. Consent version is `CONSENT_VERSION` in `lib/config.ts` (currently `2026-09-15-v1`). Copy for students is on `/privacy/`.

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

The JSON is the source of truth. The readable list above it is just for scanning.

## Fit score

The number on each eligible row is a transparent sum of four fixed weights: field alignment (0–35), CGPA headroom (0–20), location fit (0–25) and sector interest (0–20). It is not a forecast of whether anyone will be hired. Expand any score to read the four sentences that produced it.

The working name is in `lib/config.ts`.
