const ALLOWED = new Set([
  'profile_submitted',
  'shortlist_viewed',
  'program_detail_opened',
  'filter_used',
  'calendar_viewed',
  'waitlist_joined',
  'fit_breakdown_expanded',
  'debug_viewed',
]);

export function isAllowedEventType(type: string): boolean {
  return ALLOWED.has(type);
}

/**
 * Server-side event bodies must not keep an email address or a CGPA. The
 * browser session log can still hold those for a facilitated walkthrough.
 */
export function sanitiseEventPayload(
  type: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if (type === 'profile_submitted') {
    return {
      degreeField: payload.degreeField,
      graduationYear: payload.graduationYear,
      citizenship: payload.citizenship,
      needsVisaSponsorship: payload.needsVisaSponsorship,
      cityCount: Array.isArray(payload.preferredCities) ? payload.preferredCities.length : undefined,
      sectorCount: Array.isArray(payload.sectorsOfInterest)
        ? payload.sectorsOfInterest.length
        : undefined,
    };
  }
  if (type === 'waitlist_joined') {
    return { joined: true };
  }
  const { email, cgpa, ...rest } = payload;
  void email;
  void cgpa;
  return rest;
}
