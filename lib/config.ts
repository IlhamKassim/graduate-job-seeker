import { VERIFIED_COUNT, SAMPLE_COUNT, LATEST_CHECKED_ON } from '@/lib/catalog';

/**
 * Single place to change the product name. Everything user-facing reads from here.
 */
export const APP_NAME = 'Langkah';

export const APP_TAGLINE = 'Graduate programme windows for Malaysia and Singapore';

export const APP_DESCRIPTION =
  'Answer seven questions and see which Malaysian and Singaporean graduate programmes you qualify for, when each one opens, and what each will put you through.';

export const CONSENT_VERSION = '2026-09-15-v2';

export const DATA_SLICE = {
  verifiedCount: VERIFIED_COUNT,
  sampleCount: SAMPLE_COUNT,
  checkedOn: LATEST_CHECKED_ON,
} as const;

/**
 * True while any sample record remains in the catalogue. The honesty banner
 * stays available; samples are hidden until the student asks to see them.
 */
export const PILOT_MODE = SAMPLE_COUNT > 0;
