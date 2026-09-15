import { describe, expect, it } from 'vitest';
import {
  SAMPLE_COUNT,
  VERIFIED_COUNT,
  catalog,
  isVerified,
  SAMPLE_PROGRAMS_IN_CATALOG,
  VERIFIED_PROGRAMS_IN_CATALOG,
} from '@/lib/catalog';
import { PROGRAMS } from '@/data/programs';

describe('catalog', () => {
  it('hides sample rows until they are asked for', () => {
    expect(catalog(false).every(isVerified)).toBe(true);
    expect(catalog(false)).toHaveLength(VERIFIED_COUNT);
    expect(catalog(true)).toHaveLength(VERIFIED_COUNT + SAMPLE_COUNT);
    expect(catalog(true)).toHaveLength(PROGRAMS.length);
  });

  it('does not mix a verified id with a leftover sample of the same id', () => {
    const ids = PROGRAMS.map((program) => program.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(VERIFIED_PROGRAMS_IN_CATALOG.every((program) => program.checkedOn)).toBe(true);
    expect(VERIFIED_PROGRAMS_IN_CATALOG.every((program) => program.country === 'MY')).toBe(true);
    expect(SAMPLE_PROGRAMS_IN_CATALOG.every((program) => program.checkedOn === null)).toBe(true);
    expect(VERIFIED_COUNT).toBe(13);
    const rhb = VERIFIED_PROGRAMS_IN_CATALOG.find(
      (program) => program.id === 'rhb-banking-group-graduate-programme',
    );
    expect(rhb?.name).toBe('Management Associate Program');
    expect(rhb?.closesOn).toBe('2026-09-30');
    expect(rhb?.minCGPA).toBe(3.6);
    expect(SAMPLE_PROGRAMS_IN_CATALOG.some((program) => program.id === rhb?.id)).toBe(false);
    const bnm = VERIFIED_PROGRAMS_IN_CATALOG.find(
      (program) => program.id === 'bank-negara-malaysia-graduate-programme',
    );
    expect(bnm?.name).toBe('Kijang Graduate Programme');
    expect(bnm?.closesOn).toBe('2026-08-16');
    expect(bnm?.minCGPA).toBe(3.5);
    const accenture = VERIFIED_PROGRAMS_IN_CATALOG.find(
      (program) => program.id === 'accenture-graduate-programme',
    );
    expect(accenture?.name).toBe('Talent Advancement Program');
    expect(accenture?.applicationCycle).toBe('rolling');
    expect(accenture?.minCGPA).toBeNull();
  });
});
