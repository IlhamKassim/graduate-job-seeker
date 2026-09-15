# Langkah (graduate-job-seeker)

A demand-validation pilot for final-year students in Malaysia and Singapore. Answer seven questions and see which sample graduate programmes you are eligible for, when each window opens, and what each one will put you through.

This is not a product launch. Every seeded programme is **unverified sample data**. Check each detail against the employer's own careers page before anyone acts on it.

## How to run it

```bash
npm install
npm run dev
```

Open the URL the command prints (usually [http://localhost:3000](http://localhost:3000)). The app is static: there is no database, no login, and nothing you type is sent anywhere. Profile, events and waitlist live in `localStorage` on this browser only.

```bash
npm run build
```

writes a static folder to `out/` if you want to serve it with any static file server.

## Where the seed data lives

`data/programs.ts` — the 30 sample programmes.
`data/taxonomy.ts` — the canonical cities, degree fields and sectors. The form, the seed and the scorer all read from here.

`types/index.ts` is the data model. `lib/fit.ts` is the eligibility gate and the four-part fit score. `lib/storage.ts` is the only module that touches `localStorage`.

## How to swap in verified data

For each programme in `data/programs.ts`:

1. Replace placeholder fields (window months, CGPA, stages, notes, process length) with values from the employer's published page.
2. Point `sourceUrl` at that specific programme page, not the generic careers homepage.
3. Set `dataConfidence` to `'verified'`.

Leave a record unverified if you have not actually checked it. The honesty banner stays on while any unverified record is shown.

The working name is in `lib/config.ts`.

## How to read `/debug` after a pilot session

1. Walk the student through the product as they would use it.
2. Open `/debug/` on the same browser.
3. Copy the event log and the waitlist with the buttons on that page. Paste both into your session notes.
4. Use **Clear everything stored here** before handing the device to the next student.

Events you should expect if the session was used properly:

| type | when |
|---|---|
| `profile_submitted` | they submitted the seven questions |
| `shortlist_viewed` | they landed on `/shortlist` |
| `program_detail_opened` | they opened a programme |
| `filter_used` | they toggled a sector, country or window chip |
| `calendar_viewed` | they opened `/calendar` |
| `waitlist_joined` | they left an address on the shortlist |

The JSON is the source of truth. The readable list above it is just for scanning.

## Fit score

The number on each eligible row is a transparent sum of four fixed weights: field alignment (0–35), CGPA headroom (0–20), location fit (0–25) and sector interest (0–20). It is not a forecast of whether anyone will be hired. Expand any score to read the four sentences that produced it.
