'use client';

import { useSyncExternalStore } from 'react';
import { bannerDismissed, dismissBanner, samplesIncluded, subscribe } from '@/lib/storage';
import { DATA_SLICE } from '@/lib/config';
import { TESTID } from '@/lib/testids';

function formatCheckedOn(value: string | null): string {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Honesty sits above every page. The default view is the checked Malaysia slice;
 * samples stay named as samples.
 */
export function UnverifiedBanner() {
  const dismissed = useSyncExternalStore(
    subscribe,
    () => bannerDismissed(),
    () => false,
  );
  const samples = useSyncExternalStore(
    subscribe,
    () => samplesIncluded(),
    () => false,
  );

  if (dismissed) return null;

  const checked = formatCheckedOn(DATA_SLICE.checkedOn);

  return (
    <div
      data-testid={TESTID.unverifiedBanner}
      role="note"
      aria-label="Data quality notice"
      className="on-ink bg-ink text-paper"
    >
      <div className="mx-auto flex w-full max-w-[1180px] items-start gap-3 px-4 py-2 sm:items-center sm:px-6">
        <span
          aria-hidden
          className="mt-[3px] h-2.5 w-2.5 shrink-0 border border-paper bg-transparent sm:mt-0"
        />
        <p className="flex-1 font-mono text-[0.75rem] leading-[1.45] text-paper">
          {samples ? (
            <>
              Sample rows are on. Treat anything not marked Checked as a placeholder — open the
              employer page before you act on it.
            </>
          ) : (
            <>
              {DATA_SLICE.verifiedCount} Malaysian programmes checked
              {checked ? ` on ${checked}` : ''}. Windows still move. {DATA_SLICE.sampleCount}{' '}
              sample records stay hidden until you ask to see them.
            </>
          )}
        </p>
        <button
          type="button"
          data-testid={TESTID.unverifiedBannerDismiss}
          onClick={dismissBanner}
          className="-my-1 -mr-1 flex min-h-11 min-w-11 shrink-0 items-center justify-center font-mono text-[0.75rem] text-paper underline decoration-paper/50 underline-offset-2 hover:decoration-paper"
        >
          <span className="sr-only">Dismiss the sample data notice</span>
          <span aria-hidden>Dismiss</span>
        </button>
      </div>
    </div>
  );
}
