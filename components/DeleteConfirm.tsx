'use client';

import { useEffect, useState } from 'react';
import { trackWaitlistDeleted } from '@/lib/analytics';
import { DeleteRequestForm } from '@/components/DeleteRequestForm';
import { TESTID } from '@/lib/testids';

export function DeleteConfirm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/waitlist/delete/consume/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const result = (await response.json()) as { ok?: boolean; error?: string };
        if (cancelled) return;
        if (result.ok) {
          trackWaitlistDeleted();
          setDone(true);
          return;
        }
        setError(result.error ?? 'This link has expired or was already used. Ask for a new one from /delete/.');
      } catch {
        if (!cancelled) {
          setError('We could not delete that address just now. Try the link again shortly.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (done) {
    return (
      <p data-testid={TESTID.deleteDone} className="mt-4 text-[0.9375rem] leading-relaxed text-ink">
        That address and the answers stored with it are gone. We will not email it unless you
        leave it on a shortlist again, with consent.
      </p>
    );
  }

  if (!error) {
    return (
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-80">
        Confirming the deletion…
      </p>
    );
  }

  return (
    <div className="mt-4">
      <p role="alert" className="text-[0.9375rem] leading-relaxed text-ink">
        {error}
      </p>
      <DeleteRequestForm />
    </div>
  );
}
