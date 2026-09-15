import type { Profile, Program } from '@/types';

/** A seasonal MY tech programme with a named CS bar, used only in unit tests. */
export function programFixture(overrides: Partial<Program> = {}): Program {
  return {
    id: 'fixture-acme-gp',
    name: 'Graduate Programme',
    employer: 'Acme',
    sector: 'tech',
    cities: ['Kuala Lumpur'],
    country: 'MY',
    opensMonth: 7,
    closesMonth: 9,
    minCGPA: 3.0,
    degreeFields: ['Computer Science'],
    citizenshipRequired: 'MY',
    visaSponsored: false,
    stages: [{ stage: 'online_application', note: 'Apply on the employer page.' }],
    typicalProcessWeeks: 8,
    sourceUrl: 'https://example.com/programme',
    dataConfidence: 'unverified',
    applicationCycle: 'seasonal',
    checkedOn: null,
    ...overrides,
  };
}

/** A MY Computer Science profile that clears the fixture programme. */
export function profileFixture(overrides: Partial<Profile> = {}): Profile {
  return {
    degreeField: 'Computer Science',
    cgpa: 3.6,
    graduationMonth: 6,
    graduationYear: 2027,
    preferredCities: ['Kuala Lumpur'],
    sectorsOfInterest: ['tech'],
    citizenship: 'MY',
    needsVisaSponsorship: false,
    ...overrides,
  };
}
