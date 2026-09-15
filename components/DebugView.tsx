'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  clearAll,
  loadEvents,
  loadWaitlist,
  subscribe,
  type StoredEvent,
} from '@/lib/storage';
import { EVENT_LABEL } from '@/lib/analytics';
import { useMounted } from '@/lib/hooks';
import { TESTID } from '@/lib/testids';
import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

/**
 * How a pilot session is collected: the event log and waitlist as readable JSON,
 * plus a gated dump of what reached the server.
 */
export function DebugView() {
  const mounted = useMounted();
  const revision = useSyncExternalStore(
    mounted ? subscribe : emptySubscribe,
    () => snapshot(),
    () => 0,
  );

  const events = useMemo(() => (mounted ? loadEvents() : []), [mounted, revision]);
  const waitlist = useMemo(() => (mounted ? loadWaitlist() : []), [mounted, revision]);

  const eventsJson = JSON.stringify(events, null, 2);
  const waitlistJson = JSON.stringify(waitlist, null, 2);
  const empty = mounted && events.length === 0;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-8 pt-8 sm:px-6 sm:pt-10">
      <header className="rule-heavy pb-3">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[2.25rem]">
          Session log
        </h1>
        <p className="mt-2 max-w-[62ch] text-[0.9375rem] leading-relaxed text-ink-80">
          Everything this browser recorded. Copy the JSON after a facilitated
          session. The waitlist is also posted to the server when capture is
          configured; paste the operator secret below to read that copy.
        </p>
      </header>

      {!mounted ? (
        <p className="mt-8 font-mono text-[0.8125rem] text-slate">Reading this browser…</p>
      ) : (
        <div className="mt-8 flex flex-col gap-10">
          {empty ? (
            <div
              data-testid={TESTID.debugEmpty}
              className="border border-ink bg-surface p-4 sm:p-5"
            >
              <p className="text-[0.9375rem] leading-relaxed text-ink">
                Nothing has been recorded in this browser yet. Fill in the profile,
                open a shortlist, or look at the calendar, and the events will show
                up here.
              </p>
              <p className="mt-3">
                <Link href="/" className="btn btn-primary">
                  Start from the profile
                </Link>
              </p>
            </div>
          ) : (
            <p className="font-mono text-[0.75rem] text-slate">
              {events.length} {events.length === 1 ? 'event' : 'events'} · {waitlist.length}{' '}
              {waitlist.length === 1 ? 'waitlist address' : 'waitlist addresses'}
            </p>
          )}

          <section aria-labelledby="events-heading">
            <div className="rule-heavy flex flex-wrap items-end justify-between gap-3 pb-2">
              <h2 id="events-heading" className="text-[1.25rem] font-semibold tracking-[-0.02em] text-ink">
                Event log
              </h2>
              <CopyButton
                testId={TESTID.debugCopyEvents}
                text={eventsJson}
                label="Copy events"
              />
            </div>
            {events.length > 0 ? (
              <ol className="mt-4">
                {events.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </ol>
            ) : null}
            <pre
              data-testid={TESTID.debugEvents}
              className="mt-4 overflow-x-auto border border-rule bg-white p-3 font-mono text-[0.75rem] leading-relaxed text-ink"
            >
              {eventsJson}
            </pre>
          </section>

          <section aria-labelledby="waitlist-heading">
            <div className="rule-heavy flex flex-wrap items-end justify-between gap-3 pb-2">
              <h2
                id="waitlist-heading"
                className="text-[1.25rem] font-semibold tracking-[-0.02em] text-ink"
              >
                Waitlist
              </h2>
              <CopyButton
                testId={TESTID.debugCopyWaitlist}
                text={waitlistJson}
                label="Copy waitlist"
              />
            </div>
            <pre
              data-testid={TESTID.debugWaitlist}
              className="mt-4 overflow-x-auto border border-rule bg-white p-3 font-mono text-[0.75rem] leading-relaxed text-ink"
            >
              {waitlistJson}
            </pre>
          </section>

          <ServerDump />

          <section aria-labelledby="reset-heading">
            <div className="rule-heavy pb-2">
              <h2
                id="reset-heading"
                className="text-[1.25rem] font-semibold tracking-[-0.02em] text-ink"
              >
                Reset this browser
              </h2>
            </div>
            <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-ink-80">
              Wipes the saved profile, the event log, the waitlist and the banner
              dismissal. Use it before handing the device to the next student.
            </p>
            <p className="mt-4">
              <button type="button" className="btn btn-secondary" onClick={() => clearAll()}>
                Clear everything stored here
              </button>
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

function snapshot(): number {
  try {
    return (
      (window.localStorage.getItem('langkah.events.v1') || '').length +
      (window.localStorage.getItem('langkah.waitlist.v1') || '').length
    );
  } catch {
    return 0;
  }
}

function EventRow({ event }: { event: StoredEvent }) {
  return (
    <li className="register-row grid grid-cols-1 gap-1 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
      <p className="font-mono text-[0.75rem] tabular text-slate">
        {new Date(event.at).toLocaleString('en-MY', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </p>
      <div>
        <p className="text-[0.9375rem] font-medium text-ink">
          {EVENT_LABEL[event.type] ?? event.type}
        </p>
        <p className="mt-0.5 font-mono text-[0.75rem] leading-snug text-slate">
          {summarisePayload(event)}
        </p>
      </div>
    </li>
  );
}

function summarisePayload(event: StoredEvent): string {
  const payload = event.payload || {};
  if (event.type === 'profile_submitted') {
    return `${payload.degreeField}, CGPA ${payload.cgpa}, ${payload.citizenship}`;
  }
  if (event.type === 'program_detail_opened') {
    return String(payload.programId || payload.employer || '');
  }
  if (event.type === 'filter_used') {
    return `${payload.kind}${payload.value ? ` · ${payload.value}` : ''}`;
  }
  if (event.type === 'waitlist_joined') {
    return String(payload.email || '');
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return '';
  }
}

function CopyButton({
  testId,
  text,
  label,
}: {
  testId: string;
  text: string;
  label: string;
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  return (
    <button
      type="button"
      data-testid={testId}
      data-state={state}
      data-copied={state === 'copied' ? 'true' : 'false'}
      className="btn btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState('copied');
          window.setTimeout(() => setState('idle'), 2000);
        } catch {
          setState('failed');
        }
      }}
    >
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
      <span role="status" aria-live="polite" className="sr-only-focusable">
        {state === 'copied' ? 'Copied to the clipboard' : ''}
      </span>
    </button>
  );
}

function ServerDump() {
  const [secret, setSecret] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <section aria-labelledby="server-heading">
      <div className="rule-heavy pb-2">
        <h2 id="server-heading" className="text-[1.25rem] font-semibold tracking-[-0.02em] text-ink">
          Server capture
        </h2>
      </div>
      <p className="mt-3 max-w-[58ch] text-[0.9375rem] leading-relaxed text-ink-80">
        Waitlist addresses and sanitised events that reached /api. Needs{' '}
        <span className="font-mono text-[0.8125rem]">CAPTURE_ADMIN_SECRET</span>.
      </p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          try {
            const response = await fetch('/api/capture/', {
              headers: { Authorization: `Bearer ${secret}` },
            });
            const json = await response.json();
            if (!response.ok) {
              setError(typeof json.error === 'string' ? json.error : 'Could not load capture.');
              setText('');
              return;
            }
            setText(JSON.stringify(json, null, 2));
          } catch {
            setError('Could not reach the capture route.');
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <label htmlFor="capture-secret" className="sr-only-focusable">
            Operator secret
          </label>
          <input
            id="capture-secret"
            className="field-control"
            type="password"
            autoComplete="off"
            placeholder="Operator secret"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-secondary" disabled={pending}>
          {pending ? 'Loading…' : 'Load server copy'}
        </button>
      </form>
      {error ? (
        <p role="alert" className="mt-2 text-[0.8125rem] text-oxblood">
          {error}
        </p>
      ) : null}
      {text ? (
        <pre className="mt-4 overflow-x-auto border border-rule bg-white p-3 font-mono text-[0.75rem] leading-relaxed text-ink">
          {text}
        </pre>
      ) : null}
    </section>
  );
}
