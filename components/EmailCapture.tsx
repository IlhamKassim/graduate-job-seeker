'use client';

import { useState } from 'react';
import { appendWaitlist } from '@/lib/storage';
import { trackWaitlistJoined } from '@/lib/analytics';
import { CONSENT_VERSION } from '@/lib/config';
import { TESTID } from '@/lib/testids';

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function EmailCapture() {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverNote, setServerNote] = useState<string | null>(null);

  if (done) {
    return (
      <div
        data-testid={TESTID.emailDone}
        className="animate-reveal mt-12 border border-ink bg-surface p-4 sm:p-5"
      >
        <p className="text-[0.9375rem] leading-relaxed text-ink">
          {serverNote ??
            'Saved. We will only use this address to tell you when windows are checked or when a window you care about opens.'}
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
        Want these windows checked, and a note when one opens?
      </h2>
      <p className="mt-1.5 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-80">
        Leave an address. We store it to email you when more programmes are verified, or when a
        window in this register opens. We do not sell it. Read the{' '}
        <a href="/privacy/" className="text-link">
          privacy note
        </a>
        .
      </p>

      <form
        className="mt-4 flex flex-col gap-3"
        noValidate
        onSubmit={async (event) => {
          event.preventDefault();
          if (!looksLikeEmail(email)) {
            setError('Enter an address with an @ and a domain, like aina@example.com.');
            return;
          }
          if (!consent) {
            setError('Tick the box so we can store the address for that purpose.');
            return;
          }
          setError(null);
          setPending(true);
          const trimmed = email.trim();
          appendWaitlist({ id: newId(), email: trimmed, at: new Date().toISOString() });
          trackWaitlistJoined(trimmed);

          try {
            const response = await fetch('/api/waitlist/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: trimmed,
                consent: true,
                consentVersion: CONSENT_VERSION,
                companyWebsite: honeypot,
              }),
            });
            const result = (await response.json()) as {
              ok?: boolean;
              error?: string;
              persisted?: string;
              already?: boolean;
            };
            if (!response.ok || !result.ok) {
              setServerNote(
                result.error
                  ? `${result.error} Your address is still saved in this browser.`
                  : 'We could not reach the server. Your address is still saved in this browser.',
              );
            } else if (result.persisted === 'file') {
              setServerNote(
                'Saved on this machine. Production still needs a database before addresses survive a deploy.',
              );
            } else if (result.already) {
              setServerNote('That address is already on the list.');
            } else {
              setServerNote(
                'Saved. We will only use this address to tell you when windows are checked or when a window you care about opens.',
              );
            }
          } catch {
            setServerNote(
              'We could not reach the server. Your address is still saved in this browser.',
            );
          } finally {
            setPending(false);
            setDone(true);
          }
        }}
      >
        <div className="hidden" aria-hidden>
          <label htmlFor="company-website">Company website</label>
          <input
            id="company-website"
            name="companyWebsite"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
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
              aria-describedby={error ? 'waitlist-error' : 'waitlist-consent-copy'}
            />
          </div>
          <button
            type="submit"
            data-testid={TESTID.emailSubmit}
            className="btn btn-primary"
            disabled={pending}
          >
            {pending ? 'Saving…' : 'Keep me posted'}
          </button>
        </div>

        <label className="tick-option max-w-[54ch]" htmlFor="waitlist-consent">
          <input
            id="waitlist-consent"
            type="checkbox"
            checked={consent}
            onChange={(event) => {
              setConsent(event.target.checked);
              if (error) setError(null);
            }}
          />
          <span className="tick-box" aria-hidden />
          <span id="waitlist-consent-copy" className="text-[0.875rem] leading-snug text-ink">
            I agree that Langkah may store this address to email me about verified windows and
            opening dates, and may keep it until I ask for it to be deleted.
          </span>
        </label>

        {error ? (
          <p
            id="waitlist-error"
            role="alert"
            className="animate-reveal text-[0.8125rem] leading-snug text-oxblood"
          >
            {error}
          </p>
        ) : null}
      </form>
    </section>
  );
}
