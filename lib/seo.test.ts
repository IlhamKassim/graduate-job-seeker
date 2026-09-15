import { describe, expect, it } from 'vitest';
import { VERIFIED_PROGRAMS } from '@/data/verified';
import { SAMPLE_PROGRAMS_IN_CATALOG } from '@/lib/catalog';
import { programmeDescription, programmeTitle } from '@/lib/seo';

describe('programme SEO copy', () => {
  it('builds a distinct title and description per verified employer', () => {
    const titles = VERIFIED_PROGRAMS.map(programmeTitle);
    const descriptions = VERIFIED_PROGRAMS.map(programmeDescription);
    expect(new Set(titles).size).toBe(VERIFIED_PROGRAMS.length);
    expect(new Set(descriptions).size).toBe(VERIFIED_PROGRAMS.length);
    expect(descriptions.every((text) => /Checked against the employer page/.test(text))).toBe(true);
  });

  it('marks sample rows as sample data in the description', () => {
    const sample = SAMPLE_PROGRAMS_IN_CATALOG[0];
    expect(sample).toBeTruthy();
    expect(programmeDescription(sample)).toMatch(/sample data/i);
  });
});
