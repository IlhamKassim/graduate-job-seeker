'use client';

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Profile } from '@/types';
import { loadProfile, samplesIncluded, subscribe } from '@/lib/storage';

/**
 * The pages are prerendered but every answer depends on localStorage and on
 * today's date, neither of which exist at build time. These hooks draw that
 * line in one place so components can render an honest "not known yet" state on
 * the server and the real thing straight after mount.
 */

/** False during prerender and the first client render, true from the second. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/**
 * Today, pinned once per mount so a long session does not reshuffle window
 * statuses mid-scroll. Null until mounted, because the build has no "today".
 */
export function useNow(): Date | null {
  const mounted = useMounted();
  const [now] = useState(() => new Date());
  return mounted ? now : null;
}

const emptySubscribe = () => () => {};

/** The saved profile, kept in step with any write made through lib/storage. */
export function useProfile(): { profile: Profile | null; ready: boolean } {
  const mounted = useMounted();

  const snapshot = useSyncExternalStore(
    mounted ? subscribe : emptySubscribe,
    () => (mounted ? readProfileCached() : null),
    () => null,
  );

  return { profile: snapshot, ready: mounted };
}

export function useSamplesIncluded(): { included: boolean; ready: boolean } {
  const mounted = useMounted();
  const included = useSyncExternalStore(
    mounted ? subscribe : emptySubscribe,
    () => (mounted ? samplesIncluded() : false),
    () => false,
  );
  return { included, ready: mounted };
}

/**
 * useSyncExternalStore compares snapshots by identity, so parsing localStorage
 * on every call would loop forever. Cache by the serialised value instead.
 */
let cachedRaw: string | null = null;
let cachedProfile: Profile | null = null;

function readProfileCached(): Profile | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem('langkah.profile.v1');
  } catch {
    raw = null;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedProfile = loadProfile();
  }
  return cachedProfile;
}

/** Fires `handler` once, only after mount, for one-shot analytics on a page. */
export function useOnceAfterMount(handler: () => void, deps: readonly unknown[]): void {
  const stable = useCallback(handler, deps); // eslint-disable-line react-hooks/exhaustive-deps
  const [fired, setFired] = useState(false);
  useEffect(() => {
    if (fired) return;
    setFired(true);
    stable();
  }, [fired, stable]);
}

/** Matches a media query, false during prerender. */
export function useMediaQuery(query: string): boolean {
  const subscribeToQuery = useMemo(
    () => (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribeToQuery,
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}
