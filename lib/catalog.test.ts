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
    expect(SAMPLE_PROGRAMS_IN_CATALOG.every((program) => program.checkedOn === null)).toBe(true);
  });
});
