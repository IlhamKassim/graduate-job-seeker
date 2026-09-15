# Tiny backend for waitlist and events

The original pilot forbade a database and any network write so a student could be walked through the app on a shared laptop. The public site cannot learn from that: waitlist addresses and events never left the browser. We are lifting only that non-goal.

Capture is two POST routes (`/api/waitlist`, `/api/events`) plus a secret-gated GET for the operator. There is still no login, no student accounts, and no programme CMS. Programme records stay in TypeScript modules until an operator is updating windows every week.

Storage is Postgres when `DATABASE_URL` is set (Neon on Vercel). Locally it falls back to `.data/capture.json`. We did not introduce Mongo, Redis, or a second cloud for this.
