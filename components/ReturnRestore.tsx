'use client';

import { useEffect, useState } from 'react';
import { parseProfile } from '@/lib/profile';
import { saveProfile } from '@/lib/storage';
import { trackReturnVisit } from '@/lib/analytics';
import { ReturnRequestForm } from '@/components/ReturnRequestForm';

export function ReturnRestore({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch('/api/return/consume/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const result = (await response.json()) as { ok?: boolean; profile?: unknown; error?: string };
        if (cancelled) return;
        if (result.ok && result.profile) {
          const profile = parseProfile(result.profile);
          if (!profile) {
            setError('We could not read the saved answers on that link. Fill the seven questions again.');
            return;
          }
          saveProfile(profile);
          trackReturnVisit();
          window.location.replace('/shortlist/');
          return;
        }
        setError(
          result.error ??
            'This link has expired or was already used. Ask for a new one from the address we have on file.',
        );
      } catch {
        if (!cancelled) {
          setError('We could not open that shortlist just now. Try the link again shortly.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!error) {
    return (
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-80">
        Opening the shortlist we emailed you…
      </p>
    );
  }

  return (
    <div className="mt-4">
      <p role="alert" className="text-[0.9375rem] leading-relaxed text-ink">
        {error}
      </p>
      <ReturnRequestForm />
    </div>
  );
}
