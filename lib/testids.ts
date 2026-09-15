/**
 * Frozen selector contract. The verification harness targets these exact
 * strings, so renaming one means updating the harness in the same change.
 */
export const TESTID = {
  // Global chrome
  unverifiedBanner: 'unverified-banner',
  unverifiedBannerDismiss: 'unverified-banner-dismiss',
  navHome: 'nav-home',
  navShortlist: 'nav-shortlist',
  navCalendar: 'nav-calendar',

  // Landing + profile form
  profileForm: 'profile-form',
  fieldDegree: 'field-degree',
  fieldCgpa: 'field-cgpa',
  fieldGradMonth: 'field-grad-month',
  fieldGradYear: 'field-grad-year',
  fieldVisa: 'field-visa',
  profileSubmit: 'profile-submit',
  formErrorSummary: 'form-error-summary',

  // Shortlist
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

  // Program detail
  stageTimeline: 'stage-timeline',
  stageItem: 'stage-item',
  eligibilityCheck: 'eligibility-check',
  prepareList: 'prepare-list',
  prepareItem: 'prepare-item',
  sourceLink: 'source-link',
  noProfileNotice: 'no-profile-notice',

  // Calendar
  calendarAxis: 'calendar-axis',
  axisMonth: 'axis-month',
  calendarRow: 'calendar-row',
  windowBar: 'window-bar',
  graduationMarker: 'graduation-marker',
  calendarEmpty: 'calendar-empty',

  // Debug
  debugEvents: 'debug-events',
  debugWaitlist: 'debug-waitlist',
  debugCopyEvents: 'debug-copy-events',
  debugCopyWaitlist: 'debug-copy-waitlist',
  debugEmpty: 'debug-empty',
} as const;

export const filterSectorId = (sector: string) => `filter-sector-${sector}`;
export const filterCountryId = (country: string) => `filter-country-${country}`;
export const filterStatusId = (status: string) => `filter-status-${status}`;
export const cityFieldId = (city: string) =>
  `field-city-${city.toLowerCase().replace(/\s+/g, '-')}`;
export const sectorFieldId = (sector: string) => `field-sector-${sector}`;
export const citizenshipFieldId = (value: string) => `field-citizenship-${value}`;
