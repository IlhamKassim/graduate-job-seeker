import type { Program } from '@/types';
import { PROGRAMS } from '@/data/programs';

export const VERIFIED_PROGRAMS_IN_CATALOG = PROGRAMS.filter(
  (program) => program.dataConfidence === 'verified',
);

export const SAMPLE_PROGRAMS_IN_CATALOG = PROGRAMS.filter(
  (program) => program.dataConfidence !== 'verified',
);

export const VERIFIED_COUNT = VERIFIED_PROGRAMS_IN_CATALOG.length;
export const SAMPLE_COUNT = SAMPLE_PROGRAMS_IN_CATALOG.length;

export const LATEST_CHECKED_ON = VERIFIED_PROGRAMS_IN_CATALOG.reduce<string | null>(
  (latest, program) => {
    if (!program.checkedOn) return latest;
    if (!latest || program.checkedOn > latest) return program.checkedOn;
    return latest;
  },
  null,
);

export function catalog(includeSamples: boolean): Program[] {
  return includeSamples ? PROGRAMS : VERIFIED_PROGRAMS_IN_CATALOG;
}

export function isVerified(program: Program): boolean {
  return program.dataConfidence === 'verified';
}
