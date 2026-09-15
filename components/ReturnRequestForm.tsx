'use client';

import { useState } from 'react';
import { TESTID } from '@/lib/testids';

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function ReturnRequestForm() {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (done) {
    return (
      <p data-testid={TESTID.returnDone} className="mt-4 text-[0.9375rem] leading-relaxed text-ink">
        If that address is on the list, we sent a fresh link. It works once, for seven days.
      </p>
    );
  }

  return (
    <form
      data-testid={TESTID.returnForm}
      className="mt-4 flex flex-col gap-3"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (!looksLikeEmail(email)) {
          setError('Enter an address with an @ and a domain, like aina@example.com.');
          return;
        }
        setError(null);
        setPending(true);
        try {
          await fetch('/api/return/request/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email.trim(),
              companyWebsite: honeypot,
            }),
          });
          setDone(true);
        } catch {
          setError('We could not reach the server. Try again shortly.');
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="hidden" aria-hidden>
        <label htmlFor="return-company-website">Company website</label>
        <input
          id="return-company-website"
          name="companyWebsite"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <label htmlFor="return-email" className="sr-only-focusable">
            Email address
          </label>
          <input
            id="return-email"
            data-testid={TESTID.returnEmail}
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
          />
        </div>
        <button
          type="submit"
          data-testid={TESTID.returnSubmit}
          className="btn btn-primary"
          disabled={pending}
        >
          {pending ? 'Sending…' : 'Email me a link'}
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-[0.8125rem] leading-snug text-oxblood">
          {error}
        </p>
      ) : null}
    </form>
  );
}
