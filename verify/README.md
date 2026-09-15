# Langkah verification harness

Playwright checks for the Langkah pilot. Own `package.json`, own Chromium — not added to the app.

## Run

Serve a production build (`npm run build && npm start`), then from this directory:

```bash
npm install
npx playwright install chromium
node verify.mjs --base-url http://127.0.0.1:3000 --out /abs/path/to/output-dir
```

Exits `0` when every check passes. Writes `report.json` and screenshots into `--out`.

```
--only A          one group
--only A3,B4,D6   a subset
--quiet           skip screenshots
--list            print check ids
```

## Groups

| id | proves |
|---|---|
| A | the ten acceptance criteria in the brief |
| B | empty states, filters, form errors, wrapping windows, email capture, return visit, waitlist deletion, analytics |
| C | 375×812 reflow, type size, touch targets, the primary path by tap |
| D | keyboard, names, headings, reduced motion, contrast |

## Adding a check

1. Put an object `{ id, group, title, run(t) }` in the matching `checks/*.mjs` file.
2. `t.expect` is soft; `t.require` aborts that check only.
3. Seed `localStorage` through `t.session({ profile, events, waitlist, samples })` so the app never races an empty first paint. Samples default to on so wrapping-window and ineligible-row checks still see the full catalogue. Pass `samples: false` to assert the verified-only default.
4. Selectors live in `lib/contract.mjs`. If the app renames a testid, change `workspace/lib/testids.ts` in the same edit.
