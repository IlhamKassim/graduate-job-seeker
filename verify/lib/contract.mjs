/**
 * The frozen selector contract, mirrored from workspace/lib/testids.ts, plus the
 * localStorage keys and the fixture profiles the checks drive the app with.
 *
 * This file is the only place a selector string is written. If the app renames a
 * testid, testids.ts and this file move together — nothing else in the harness
 * hard-codes a selector.
 */

export const TESTID = {
  unverifiedBanner: 'unverified-banner',
  unverifiedBannerDismiss: 'unverified-banner-dismiss',
  navHome: 'nav-home',
  navShortlist: 'nav-shortlist',
  navCalendar: 'nav-calendar',

  profileForm: 'profile-form',
  fieldDegree: 'field-degree',
  fieldCgpa: 'field-cgpa',
  fieldGradMonth: 'field-grad-month',
  fieldGradYear: 'field-grad-year',
  fieldVisa: 'field-visa',
  profileSubmit: 'profile-submit',
  formErrorSummary: 'form-error-summary',

  shortlistRow: 'shortlist-row',
  shortlistEmpty: 'shortlist-empty',
  shortlistNoProfile: 'shortlist-no-profile',
  fitTotal: 'fit-total',
  fitToggle: 'fit-toggle',
  fitBreakdown: 'fit-breakdown',
  fitComponent: 'fit-component',
  windowStatus: 'window-status',
  ineligibleRow: 'ineligible-row',
  ineligibleReason: 'ineligible-reason',
  filterReset: 'filter-reset',
  emailCapture: 'email-capture',
  emailInput: 'email-input',
  emailSubmit: 'email-submit',
  emailDone: 'email-done',
  emailConsent: 'email-consent',
  filterSamples: 'filter-samples',
  returnForm: 'return-form',
  returnEmail: 'return-email',
  returnSubmit: 'return-submit',
  returnDone: 'return-done',

  stageTimeline: 'stage-timeline',
  stageItem: 'stage-item',
  eligibilityCheck: 'eligibility-check',
  prepareList: 'prepare-list',
  prepareItem: 'prepare-item',
  sourceLink: 'source-link',
  noProfileNotice: 'no-profile-notice',

  calendarAxis: 'calendar-axis',
  axisMonth: 'axis-month',
  calendarRow: 'calendar-row',
  windowBar: 'window-bar',
  graduationMarker: 'graduation-marker',
  calendarEmpty: 'calendar-empty',

  debugEvents: 'debug-events',
  debugWaitlist: 'debug-waitlist',
  debugCopyEvents: 'debug-copy-events',
  debugCopyWaitlist: 'debug-copy-waitlist',
  debugEmpty: 'debug-empty',
};

export const filterSectorId = (sector) => `filter-sector-${sector}`;
export const filterCountryId = (country) => `filter-country-${country}`;
export const filterStatusId = (status) => `filter-status-${status}`;
export const cityFieldId = (city) => `field-city-${city.toLowerCase().replace(/\s+/g, '-')}`;
export const sectorFieldId = (sector) => `field-sector-${sector}`;
export const citizenshipFieldId = (value) => `field-citizenship-${value}`;

/** A CSS selector for a testid. */
export const tid = (name) => `[data-testid="${name}"]`;

export const STORAGE_KEYS = {
  profile: 'langkah.profile.v1',
  events: 'langkah.events.v1',
  waitlist: 'langkah.waitlist.v1',
  banner: 'langkah.banner.v1',
  samples: 'langkah.samples.v1',
};

export const ROUTES = {
  landing: '/',
  shortlist: '/shortlist/',
  calendar: '/calendar/',
  debug: '/debug/',
  returnVisit: '/return/',
};

export const CITIES = ['Kuala Lumpur', 'Penang', 'Johor', 'Kota Kinabalu', 'Singapore'];

export const SECTORS = [
  'banking',
  'tech',
  'semiconductor',
  'consulting',
  'fmcg',
  'energy',
  'telco',
  'government',
];

export const COUNTRIES = ['MY', 'SG'];

export const WINDOW_STATUSES = ['open', 'opening_soon', 'closed'];

export const DEGREE_FIELDS = [
  'Accounting',
  'Actuarial Science',
  'Business Administration',
  'Chemical Engineering',
  'Civil Engineering',
  'Computer Science',
  'Data Science',
  'Economics',
  'Electrical & Electronic Engineering',
  'Environmental Science',
  'Finance',
  'Human Resource Management',
  'Information Systems',
  'Law',
  'Marketing',
  'Mathematics',
  'Mechanical Engineering',
  'Physics',
  'Political Science',
  'Psychology',
  'Public Administration',
  'Software Engineering',
  'Statistics',
  'Supply Chain Management',
];

export const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** The four fit components, as named in lib/fit.ts COMPONENT_LABEL. */
export const FIT_COMPONENT_LABELS = [
  'field alignment',
  'cgpa headroom',
  'location fit',
  'sector interest',
];

/**
 * The profile the acceptance flow uses. Deliberately broad — a Computer Science
 * graduate with a comfortable CGPA and three cities should clear the eligibility
 * gate on several seeded programmes while still failing some, so both the
 * eligible and the ineligible half of /shortlist/ have something in them.
 */
export const PROFILE_MAIN = {
  degreeField: 'Computer Science',
  cgpa: 3.6,
  graduationMonth: 6,
  graduationYear: 2027,
  preferredCities: ['Kuala Lumpur', 'Penang', 'Singapore'],
  sectorsOfInterest: ['tech', 'banking', 'semiconductor'],
  citizenship: 'MY',
  needsVisaSponsorship: false,
};

/** Same profile, graduating in January — the left end of the calendar axis. */
export const PROFILE_GRAD_JAN = { ...PROFILE_MAIN, graduationMonth: 1 };

/** Same profile, graduating in December — the right end of the calendar axis. */
export const PROFILE_GRAD_DEC = { ...PROFILE_MAIN, graduationMonth: 12 };

/**
 * Candidates for "matches nothing". Each fails the eligibility gate on three
 * axes at once: a CGPA below any plausible minimum, a citizenship no programme
 * can require, and a demand for visa sponsorship. The degree field varies
 * because which field no seeded programme names depends on the seed data, so
 * the harness probes these in order and uses the first that returns no rows.
 */
export const NO_MATCH_CANDIDATES = [
  'Environmental Science',
  'Public Administration',
  'Political Science',
  'Law',
  'Psychology',
  'Marketing',
].map((degreeField) => ({
  degreeField,
  cgpa: 0,
  graduationMonth: 9,
  graduationYear: 2027,
  preferredCities: ['Kota Kinabalu'],
  sectorsOfInterest: ['government'],
  citizenship: 'other',
  needsVisaSponsorship: true,
}));

/** Seed event log used by the /debug/ checks that need a non-empty log. */
export const SEED_EVENTS = [
  {
    id: 'seed-1',
    type: 'profile_submitted',
    at: '2026-09-01T02:00:00.000Z',
    payload: { degreeField: 'Computer Science', cgpa: 3.6 },
  },
  {
    id: 'seed-2',
    type: 'shortlist_viewed',
    at: '2026-09-01T02:00:05.000Z',
    payload: { eligible: 4, ineligible: 2 },
  },
];

export const SEED_WAITLIST = [
  { id: 'seed-w-1', email: 'seeded.tester@example.com', at: '2026-09-01T02:01:00.000Z' },
];

/**
 * Language the pilot must never use. The product ranks on stated rules, so any
 * word that implies a model made a guess is a promise the app cannot keep.
 *
 * Each pattern is anchored so it cannot fire inside a longer word: `AI` must not
 * match `available`, `email`, `Malaysia` or `explained`.
 */
export const BANNED_PATTERNS = [
  { label: 'AI', re: /(?<![A-Za-z0-9])AI(?![A-Za-z0-9])/gi },
  { label: 'A.I.', re: /(?<![A-Za-z0-9])A\.\s?I\.?(?![A-Za-z0-9])/gi },
  { label: 'artificial intelligence', re: /\bartificial\s+intelligence\b/gi },
  { label: 'machine learning', re: /\bmachine\s+learning\b/gi },
  { label: 'ML model', re: /\bML\s+model/gi },
  { label: 'predict*', re: /\bpredict(s|ed|ing|ion|ions|ive|ively)?\b/gi },
  { label: 'probability/probable', re: /\bprobab(ility|ilities|le|ly)\b/gi },
  { label: 'likelihood', re: /\blikelihood\b/gi },
  { label: 'chance of', re: /\bchance\s+of\b/gi },
  { label: 'algorithm-matched', re: /\balgorithm[-\s]matched\b/gi },
  { label: 'smart match', re: /\bsmart[-\s]match(ed|es|ing)?\b/gi },
];
