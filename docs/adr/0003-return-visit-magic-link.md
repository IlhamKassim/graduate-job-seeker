# Return visits use a one-time link, not an account

A student who leaves the tab loses the seven answers, because they live in that browser. Full accounts, OAuth, and passwords are still out of scope. The smallest honest loop is: store the answers with the waitlist row after consent, email a copy of the public shortlist (no CGPA), and a one-time link that writes those answers back into localStorage.

The token in the URL is opaque and stored as a SHA-256 hash. Consume marks it used. There is no session cookie. Mail goes through Resend when `RESEND_API_KEY` is set; otherwise the operator dump keeps the outbound body so a facilitated session can still forward the link.
