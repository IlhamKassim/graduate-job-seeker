import { describe, expect, it } from 'vitest';
import { eligibilityReasons, fitBand, isEligible, scoreAll, scoreProgram } from '@/lib/fit';
import { profileFixture, programFixture } from '@/lib/test-fixtures';

describe('eligibilityReasons', () => {
  it('returns nothing when the profile clears every rule', () => {
    expect(eligibilityReasons(programFixture(), profileFixture())).toEqual([]);
    expect(isEligible(programFixture(), profileFixture())).toBe(true);
  });

  it('names a CGPA miss with both numbers', () => {
    const reasons = eligibilityReasons(programFixture({ minCGPA: 3.5 }), profileFixture({ cgpa: 3.2 }));
    expect(reasons.map((reason) => reason.code)).toEqual(['cgpa']);
    expect(reasons[0].sentence).toContain('3.50');
    expect(reasons[0].sentence).toContain('3.20');
  });

  it('skips the CGPA rule when the programme published no minimum', () => {
    const reasons = eligibilityReasons(programFixture({ minCGPA: null }), profileFixture({ cgpa: 2.1 }));
    expect(reasons.map((reason) => reason.code)).not.toContain('cgpa');
  });

  it('names a field miss without opening the gate for an adjacent degree', () => {
    const program = programFixture({ degreeFields: ['Software Engineering'] });
    const reasons = eligibilityReasons(program, profileFixture({ degreeField: 'Computer Science' }));
    expect(reasons.map((reason) => reason.code)).toEqual(['field']);
    expect(reasons[0].sentence).toMatch(/Software Engineering/);
    expect(isEligible(program, profileFixture({ degreeField: 'Computer Science' }))).toBe(false);
  });

  it('rejects a citizenship miss when the employer does not sponsor a visa', () => {
    const reasons = eligibilityReasons(
      programFixture({ citizenshipRequired: 'MY', visaSponsored: false }),
      profileFixture({ citizenship: 'SG' }),
    );
    expect(reasons.map((reason) => reason.code)).toEqual(['citizenship']);
    expect(reasons[0].sentence).toMatch(/Malaysian|Malaysia/i);
  });

  it('rejects a visa need when the employer does not sponsor', () => {
    const reasons = eligibilityReasons(
      programFixture({ citizenshipRequired: 'any', visaSponsored: false }),
      profileFixture({ citizenship: 'other', needsVisaSponsorship: true }),
    );
    expect(reasons.map((reason) => reason.code)).toEqual(['citizenship']);
    expect(reasons[0].sentence).toMatch(/visa sponsorship/i);
  });

  it('collects every failing rule, not just the first', () => {
    const reasons = eligibilityReasons(
      programFixture({
        minCGPA: 3.5,
        degreeFields: ['Finance'],
        citizenshipRequired: 'MY',
        visaSponsored: false,
      }),
      profileFixture({
        cgpa: 3.0,
        degreeField: 'Law',
        citizenship: 'other',
        needsVisaSponsorship: true,
      }),
    );
    expect(reasons.map((reason) => reason.code).sort()).toEqual(['cgpa', 'citizenship', 'field']);
  });
});

describe('scoreProgram', () => {
  it('sums the four components for an eligible profile and keeps the total at most 100', () => {
    const fit = scoreProgram(programFixture(), profileFixture());
    expect(fit.eligible).toBe(true);
    expect(fit.reasons).toEqual([]);
    expect(fit.total).toBe(
      fit.components.fieldAlignment +
        fit.components.cgpaHeadroom +
        fit.components.locationFit +
        fit.components.sectorInterest,
    );
    expect(fit.total).toBeGreaterThan(0);
    expect(fit.total).toBeLessThanOrEqual(100);
    expect(fit.breakdown).toHaveLength(4);
  });

  it('gives full field marks when the degree is one of a short named list', () => {
    const fit = scoreProgram(programFixture({ degreeFields: ['Computer Science'] }), profileFixture());
    expect(fit.components.fieldAlignment).toBe(35);
  });

  it('gives partial field credit for an adjacent degree even though the gate failed', () => {
    const fit = scoreProgram(
      programFixture({ degreeFields: ['Software Engineering'] }),
      profileFixture({ degreeField: 'Computer Science' }),
    );
    expect(fit.eligible).toBe(false);
    expect(fit.total).toBe(0);
    expect(fit.components.fieldAlignment).toBe(12);
  });

  it('scores CGPA mid-range when no minimum was published', () => {
    const fit = scoreProgram(programFixture({ minCGPA: null }), profileFixture());
    expect(fit.components.cgpaHeadroom).toBe(12);
  });

  it('gives full location marks on a city hit and a country consolation otherwise', () => {
    const sameCity = scoreProgram(programFixture(), profileFixture({ preferredCities: ['Kuala Lumpur'] }));
    expect(sameCity.components.locationFit).toBe(25);

    const sameCountry = scoreProgram(
      programFixture({ cities: ['Penang'] }),
      profileFixture({ preferredCities: ['Kuala Lumpur'] }),
    );
    expect(sameCountry.components.locationFit).toBe(14);

    const otherCountry = scoreProgram(
      programFixture({ cities: ['Singapore'], country: 'SG' }),
      profileFixture({ preferredCities: ['Kuala Lumpur'] }),
    );
    expect(otherCountry.components.locationFit).toBe(0);
  });

  it('zeros the published total when the gate fails', () => {
    const fit = scoreProgram(programFixture({ minCGPA: 3.9 }), profileFixture({ cgpa: 3.0 }));
    expect(fit.eligible).toBe(false);
    expect(fit.total).toBe(0);
    expect(fit.reasons.length).toBeGreaterThan(0);
  });
});

describe('scoreAll', () => {
  it('ranks eligible programmes by total then employer name, and keeps ineligible out of that list', () => {
    const high = programFixture({ id: 'high', employer: 'Zenith', name: 'A', minCGPA: 3.0 });
    const low = programFixture({
      id: 'low',
      employer: 'Acme',
      name: 'B',
      minCGPA: 3.0,
      sector: 'banking',
    });
    const blocked = programFixture({ id: 'blocked', employer: 'Blocked Co', minCGPA: 3.9 });

    const { eligible, ineligible } = scoreAll([low, blocked, high], profileFixture());
    expect(eligible.map((entry) => entry.program.id)).toEqual(['high', 'low']);
    expect(ineligible.map((entry) => entry.program.id)).toEqual(['blocked']);
    expect(eligible[0].fit.total).toBeGreaterThanOrEqual(eligible[1].fit.total);
  });
});

describe('fitBand', () => {
  it('labels totals without promising an outcome', () => {
    expect(fitBand(90)).toBe('Very close match');
    expect(fitBand(70)).toBe('Close match');
    expect(fitBand(55)).toBe('Partial match');
    expect(fitBand(40)).toBe('Loose match');
  });
});
