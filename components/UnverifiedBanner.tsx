'use client';

import { useSyncExternalStore } from 'react';
import { bannerDismissed, dismissBanner, subscribe } from '@/lib/storage';
import { TESTID } from '@/lib/testids';

const emptySubscribe = () => () => {};

/**
 * Every programme in this build is sample data. Anyone looking at a screen here
 * needs to know that before they act on it, so the banner sits above the content
 * on every page and stays until it is dismissed on purpose.
 */
export function UnverifiedBanner() {
  const dismissed = useSyncExternalStore(
    subscribe,
    () => bannerDismissed(),
    () => false,
  );

  if (dismissed) return null;

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
          Sample data, not verified. Every programme below is a placeholder for testing this
          pilot — check each detail against the employer&rsquo;s own careers page before you
          rely on it.
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
