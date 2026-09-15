import type { Profile, Sector, WindowStatus } from '@/types';
import { appendEvent, type EventType, type StoredEvent } from '@/lib/storage';

/**
 * The pilot's whole reason for existing is finding out what students actually
 * do with it. It still writes a session log to this browser, and it also posts
 * a sanitised copy to /api/events so a public session is not lost.
 */

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function record(type: EventType, payload: Record<string, unknown> = {}): void {
  const event: StoredEvent = { id: newId(), type, at: new Date().toISOString(), payload };
  appendEvent(event);
  if (typeof fetch === 'undefined') return;
  void fetch('/api/events/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: event.id,
      type: event.type,
      at: event.at,
      payload: event.payload,
    }),
    keepalive: true,
  }).catch(() => {
    // Capture is best-effort. The browser log is still the local record.
  });
}

export function trackProfileSubmitted(profile: Profile): void {
  record('profile_submitted', {
    degreeField: profile.degreeField,
    cgpa: profile.cgpa,
    graduationMonth: profile.graduationMonth,
    graduationYear: profile.graduationYear,
    preferredCities: profile.preferredCities,
    sectorsOfInterest: profile.sectorsOfInterest,
    citizenship: profile.citizenship,
    needsVisaSponsorship: profile.needsVisaSponsorship,
  });
}

export function trackShortlistViewed(counts: { eligible: number; ineligible: number }): void {
  record('shortlist_viewed', counts);
}

export function trackProgramDetailOpened(programId: string, employer: string): void {
  record('program_detail_opened', { programId, employer });
}

export type FilterKind = 'sector' | 'country' | 'status' | 'reset' | 'samples';

export function trackFilterUsed(
  kind: FilterKind,
  value: Sector | 'MY' | 'SG' | WindowStatus | null,
  active: boolean,
): void {
  record('filter_used', { kind, value, active });
}

export function trackCalendarViewed(programCount: number): void {
  record('calendar_viewed', { programCount });
}

export function trackWaitlistJoined(email: string): void {
  record('waitlist_joined', { email });
}

export function trackFitBreakdownExpanded(programId: string, total: number): void {
  record('fit_breakdown_expanded', { programId, total });
}

export function trackDebugViewed(eventCount: number, waitlistCount: number): void {
  record('debug_viewed', { eventCount, waitlistCount });
}

export function trackReturnVisit(): void {
  record('return_visit', { restored: true });
}

export const EVENT_LABEL: Record<EventType, string> = {
  profile_submitted: 'Profile submitted',
  shortlist_viewed: 'Shortlist viewed',
  program_detail_opened: 'Programme detail opened',
  filter_used: 'Filter used',
  calendar_viewed: 'Calendar viewed',
  waitlist_joined: 'Waitlist joined',
  fit_breakdown_expanded: 'Fit breakdown expanded',
  debug_viewed: 'Debug viewed',
  return_visit: 'Returned with emailed shortlist',
};
