'use client';

import { useState } from 'react';
import { appendWaitlist } from '@/lib/storage';
import { trackWaitlistJoined } from '@/lib/analytics';
import { TESTID } from '@/lib/testids';

/** Deliberately permissive: enough to catch a typo, not enough to reject a real address. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The pilot's one ask, and it comes after the answer rather than before it. One
 * field, no modal, and it says plainly what the address is for.
 */
export function EmailCapture() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div
        data-testid={TESTID.emailDone}
        className="animate-reveal mt-12 border border-ink bg-surface p-4 sm:p-5"
      >
        <p className="text-[0.9375rem] leading-relaxed text-ink">
          Saved. Your address is in this browser only — this pilot has nowhere to send it yet,
          which is the honest answer.
        </p>
      </div>
    );
  }

  return (
    <section
      data-testid={TESTID.emailCapture}
      aria-labelledby="waitlist-heading"
      className="mt-12 border border-ink bg-surface p-4 sm:p-5"
    >
      <h2
        id="waitlist-heading"
        className="text-[1.0625rem] font-semibold tracking-[-0.015em] text-ink"
      >
        Want these windows checked against real employer pages?
      </h2>
      <p className="mt-1.5 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-80">
        Leave an address and we will tell you when the data behind this is verified rather
        than sampled.
      </p>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!looksLikeEmail(email)) {
            setError('Enter an address with an @ and a domain, like aina@example.com.');
            return;
          }
          setError(null);
          appendWaitlist({ id: newId(), email: email.trim(), at: new Date().toISOString() });
          trackWaitlistJoined(email.trim());
          setDone(true);
        }}
      >
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <label htmlFor="waitlist-email" className="sr-only-focusable">
            Email address
          </label>
          <input
            id="waitlist-email"
            data-testid={TESTID.emailInput}
            className="field-control"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (error) setError(null);
            }}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'waitlist-error' : undefined}
          />
          {error ? (
            <p
              id="waitlist-error"
              role="alert"
              className="animate-reveal mt-2 text-[0.8125rem] leading-snug text-oxblood"
            >
              {error}
            </p>
          ) : null}
        </div>
        <button type="submit" data-testid={TESTID.emailSubmit} className="btn btn-primary">
          Keep me posted
        </button>
      </form>
    </section>
  );
}
