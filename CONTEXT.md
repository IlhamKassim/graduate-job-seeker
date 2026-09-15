# Langkah

A register of graduate-programme windows for final-year students in Malaysia (first) and Singapore (second). It answers three questions: whether you are eligible, when the window is, and what the process will put you through.

## Language

**Programme**:
A named graduate hiring scheme at one employer, with one eligibility bar and one application window.
_Avoid_: Job, vacancy, role, course

**Window**:
The months when that programme accepts applications. Seasonal windows have a start and end month. Rolling windows accept applications year-round, sometimes with intake cut-offs inside the year.
_Avoid_: Deadline (unless the employer published a calendar date), intake (the start-work cohort, not the apply period)

**Profile**:
The seven answers a student gives once: field, CGPA, graduation month and year, cities, sectors, citizenship, and whether they need visa sponsorship.
_Avoid_: Account, user, CV

**Eligibility**:
A hard gate. A programme is eligible or it is not. Failure is always named (CGPA, field, or citizenship/visa).
_Avoid_: Match, recommendation, ranking (those belong to fit)

**Fit**:
A 0–100 transparent sum of four fixed weights after the gate is passed. It is a heuristic, not a forecast of being hired.
_Avoid_: AI score, probability, prediction, chance

**Verified**:
A programme record checked against the employer's own published page on a recorded date, with a programme-specific source URL. Unknown fields stay empty rather than guessed.
_Avoid_: Accurate, official, guaranteed

**Sample**:
A placeholder record used to test the product. It must never be presented as a fact.
_Avoid_: Real, live, typical (when used to imply the numbers are true)

**Shortlist**:
The eligible programmes for this profile, ranked by fit, plus the ineligible ones with reasons. Not a saved folder of favourites.
_Avoid_: Wishlist, bookmarks, applications

**Waitlist**:
An email address left after the shortlist, with consent to be sent that shortlist, a one-time restore link, and a note when a saved window is about to open. Deletion is the same loop on `/delete/`: a one-time link, without confirming whether the address is listed. Not a marketing list.
_Avoid_: Newsletter, subscribers, leads, account

**Capture**:
The server-side record of a waitlist join or a product event. Distinct from the browser session log, which still lives on the device.
_Avoid_: Analytics (the product events have names; the store is capture)

**Session log**:
The event list in this browser, shown at `/debug`. Useful on a shared laptop during a facilitated session. Not the source of truth once capture exists.
