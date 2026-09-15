import type { Metadata } from 'next';
import Link from 'next/link';
import { APP_NAME, CONSENT_VERSION } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Privacy',
  description: `How ${APP_NAME} stores a profile, a waitlist address, and product events.`,
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-[62ch] px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <p className="font-mono text-[0.75rem] text-slate">
        <Link href="/" className="text-link">
          ← Home
        </Link>
      </p>
      <h1 className="mt-4 text-[1.75rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.25rem]">
        Privacy
      </h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-80">
        This note is for students in Malaysia (and anyone else who uses the site). It is written
        in plain language on purpose. Consent version {CONSENT_VERSION}.
      </p>

      <h2 className="mt-8 text-[1.15rem] font-semibold tracking-[-0.02em] text-ink">
        What stays on your device
      </h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-80">
        Your profile, the session log, and a copy of any waitlist address you typed are stored in
        this browser&rsquo;s localStorage. Clearing site data deletes them. There is no account.
      </p>

      <h2 className="mt-8 text-[1.15rem] font-semibold tracking-[-0.02em] text-ink">
        What we store if you join the waitlist
      </h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-80">
        If you tick the consent box and submit an address, we store that address, the time, this
        consent version, and the seven answers you had just given, so we can email you this
        shortlist, a one-time link to open it on another phone, and a note when a saved window
        is opening or in its last month. We do not sell the list or use it for unrelated
        marketing. The email itself does not include your CGPA.
      </p>

      <h2 className="mt-8 text-[1.15rem] font-semibold tracking-[-0.02em] text-ink">
        Product events
      </h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-80">
        The site records whether a profile was submitted, a shortlist or calendar was opened, a
        filter was used, a programme was opened, and whether someone joined the waitlist. The
        server copy does not keep your email on those events, and it does not keep your CGPA.
      </p>

      <h2 className="mt-8 text-[1.15rem] font-semibold tracking-[-0.02em] text-ink">
        How long, and how to ask us to delete
      </h2>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-80">
        Waitlist rows stay until you ask for deletion, or until we shut the list down. A restore
        link works once and expires after seven days. Event rows are working notes for this
        pilot and should not be treated as a permanent file. To delete an address and the
        answers stored with it, email the operator named on the GitHub repository for this
        project with the address you used.
      </p>
    </div>
  );
}
