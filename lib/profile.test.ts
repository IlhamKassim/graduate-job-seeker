import { describe, expect, it } from 'vitest';
import { parseProfile, parseProgrammeIds } from '@/lib/profile';
import { profileFixture } from '@/lib/test-fixtures';

describe('parseProfile', () => {
  it('accepts a complete valid profile', () => {
    expect(parseProfile(profileFixture())).toEqual(profileFixture());
  });

  it('rejects an out-of-range CGPA and an unknown field', () => {
    expect(parseProfile(profileFixture({ cgpa: 4.2 }))).toBeNull();
    expect(parseProfile({ ...profileFixture(), degreeField: 'Astrology' })).toBeNull();
  });
});

describe('parseProgrammeIds', () => {
  it('keeps known ids in order and drops the rest', () => {
    expect(parseProgrammeIds(['b', 'nope', 'b', 'a'], ['a', 'b'])).toEqual(['b', 'a']);
  });
});
