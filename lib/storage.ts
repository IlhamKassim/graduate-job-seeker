import type { Profile } from '@/types';
import { parseProfile } from '@/lib/profile';

/**
 * The only module that touches localStorage.
 *
 * Everything is read defensively: a pilot gets opened on shared laptops, in
 * private windows and after the data shape has moved on, so a corrupt or stale
 * value must degrade to "nothing saved" rather than throw on load.
 */

const KEY = {
  profile: 'langkah.profile.v1',
  events: 'langkah.events.v1',
  waitlist: 'langkah.waitlist.v1',
  banner: 'langkah.banner.v1',
  samples: 'langkah.samples.v1',
} as const;

export const STORAGE_KEYS = KEY;

export interface StoredEvent {
  id: string;
  type: EventType;
  at: string;
  payload: Record<string, unknown>;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  at: string;
}

export type EventType =
  | 'profile_submitted'
  | 'shortlist_viewed'
  | 'program_detail_opened'
  | 'filter_used'
  | 'calendar_viewed'
  | 'waitlist_joined'
  | 'fit_breakdown_expanded'
  | 'debug_viewed'
  | 'return_visit'
  | 'waitlist_deleted';

type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe to any write made through this module. Returns an unsubscribe. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function available(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const probe = '__langkah_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    // Private mode, disabled storage, or a quota wall. The app still works; it
    // just forgets between page loads.
    return null;
  }
}

function readJson<T>(key: string): T | null {
  const store = available();
  if (!store) return null;
  const raw = store.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): boolean {
  const store = available();
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    emit();
    return true;
  } catch {
    return false;
  }
}

/** True when this browser will actually remember anything between page loads. */
export function storageAvailable(): boolean {
  return available() !== null;
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export function loadProfile(): Profile | null {
  return parseProfile(readJson<unknown>(KEY.profile));
}

export function saveProfile(profile: Profile): boolean {
  return writeJson(KEY.profile, profile);
}

export function clearProfile(): void {
  const store = available();
  if (!store) return;
  store.removeItem(KEY.profile);
  emit();
}

// ---------------------------------------------------------------------------
// Event log
// ---------------------------------------------------------------------------

/** Keeps a pilot session's log from growing without bound on a shared device. */
const MAX_EVENTS = 500;

export function loadEvents(): StoredEvent[] {
  const value = readJson<unknown>(KEY.events);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is StoredEvent =>
      Boolean(entry) &&
      typeof entry === 'object' &&
      typeof (entry as StoredEvent).id === 'string' &&
      typeof (entry as StoredEvent).type === 'string' &&
      typeof (entry as StoredEvent).at === 'string',
  );
}

export function appendEvent(event: StoredEvent): boolean {
  const existing = loadEvents();
  const next = [...existing, event].slice(-MAX_EVENTS);
  return writeJson(KEY.events, next);
}

export function clearEvents(): void {
  const store = available();
  if (!store) return;
  store.removeItem(KEY.events);
  emit();
}

// ---------------------------------------------------------------------------
// Waitlist
// ---------------------------------------------------------------------------

export function loadWaitlist(): WaitlistEntry[] {
  const value = readJson<unknown>(KEY.waitlist);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is WaitlistEntry =>
      Boolean(entry) &&
      typeof entry === 'object' &&
      typeof (entry as WaitlistEntry).email === 'string',
  );
}

export function appendWaitlist(entry: WaitlistEntry): boolean {
  const existing = loadWaitlist();
  return writeJson(KEY.waitlist, [...existing, entry]);
}

export function clearWaitlist(): void {
  const store = available();
  if (!store) return;
  store.removeItem(KEY.waitlist);
  emit();
}

// ---------------------------------------------------------------------------
// Unverified-data banner
// ---------------------------------------------------------------------------

export function bannerDismissed(): boolean {
  const value = readJson<{ dismissed?: unknown }>(KEY.banner);
  return value?.dismissed === true;
}

export function dismissBanner(): void {
  writeJson(KEY.banner, { dismissed: true });
}

export function restoreBanner(): void {
  writeJson(KEY.banner, { dismissed: false });
}

export function samplesIncluded(): boolean {
  const value = readJson<{ included?: unknown }>(KEY.samples);
  return value?.included === true;
}

export function setSamplesIncluded(included: boolean): void {
  writeJson(KEY.samples, { included });
}

/** Wipes every key this module owns. Used by the reset control on /debug. */
export function clearAll(): void {
  const store = available();
  if (!store) return;
  Object.values(KEY).forEach((key) => store.removeItem(key));
  emit();
}
