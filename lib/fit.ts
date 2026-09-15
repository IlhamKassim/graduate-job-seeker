import type {
  FitComponentDetail,
  FitComponents,
  FitResult,
  IneligibilityReason,
  Profile,
  Program,
} from '@/types';
import { CITY_COUNTRY, COUNTRY_LABEL, FIELD_ADJACENCY, SECTOR_LABEL } from '@/data/taxonomy';

/**
 * Fit scoring.
 *
 * This is a transparent heuristic with four fixed weights. It is not a model,
 * it does not learn, and it does not estimate anyone's odds of being hired. Every
 * number it returns comes with the sentence that produced it, because a score a
 * student cannot interrogate is worse than no score at all.
 *
 * Stage one is a hard eligibility gate. Stage two scores whatever clears it.
 */

export const COMPONENT_MAX: Record<keyof FitComponents, number> = {
  fieldAlignment: 35,
  cgpaHeadroom: 20,
  locationFit: 25,
  sectorInterest: 20,
};

export const COMPONENT_LABEL: Record<keyof FitComponents, string> = {
  fieldAlignment: 'Field alignment',
  cgpaHeadroom: 'CGPA headroom',
  locationFit: 'Location fit',
  sectorInterest: 'Sector interest',
};

/** The CGPA margin above a minimum that we treat as fully comfortable. */
const COMFORTABLE_MARGIN = 0.5;

export function formatCgpa(value: number): string {
  return value.toFixed(2);
}

function listFields(fields: string[]): string {
  if (fields.length === 0) return 'no named fields';
  if (fields.length === 1) return fields[0];
  if (fields.length === 2) return `${fields[0]} and ${fields[1]}`;
  if (fields.length <= 4) {
    return `${fields.slice(0, -1).join(', ')} and ${fields[fields.length - 1]}`;
  }
  const others = fields.length - 3;
  return `${fields.slice(0, 3).join(', ')} and ${others} other ${others === 1 ? 'field' : 'fields'}`;
}

function isAdjacentField(profileField: string, programFields: string[]): boolean {
  const neighbours = FIELD_ADJACENCY[profileField] ?? [];
  return programFields.some((field) => neighbours.includes(field));
}

function countryOf(city: string): 'MY' | 'SG' | undefined {
  return CITY_COUNTRY[city as keyof typeof CITY_COUNTRY];
}

// ---------------------------------------------------------------------------
// Stage one: the hard eligibility gate
// ---------------------------------------------------------------------------

/**
 * Every rule the profile fails, each as one plain sentence. An empty array means
 * the programme is eligible. Failing programmes are never hidden — knowing the
 * specific reason is more useful than a shorter list.
 */
export function eligibilityReasons(program: Program, profile: Profile): IneligibilityReason[] {
  const reasons: IneligibilityReason[] = [];

  if (program.minCGPA !== null && profile.cgpa < program.minCGPA) {
    reasons.push({
      code: 'cgpa',
      sentence: `Requires CGPA ${formatCgpa(program.minCGPA)}; yours is ${formatCgpa(profile.cgpa)}.`,
    });
  }

  if (!program.degreeFields.includes(profile.degreeField)) {
    const anyField = program.degreeFields.length >= 20;
    reasons.push({
      code: 'field',
      sentence: anyField
        ? `This programme lists a wide set of fields and still does not include ${profile.degreeField}.`
        : `Open to ${listFields(program.degreeFields)}; your degree is ${profile.degreeField}.`,
    });
  }

  const citizenshipMismatch =
    program.citizenshipRequired !== 'any' && profile.citizenship !== program.citizenshipRequired;

  if (citizenshipMismatch && !program.visaSponsored) {
    const required = COUNTRY_LABEL[program.citizenshipRequired as 'MY' | 'SG'];
    reasons.push({
      code: 'citizenship',
      sentence: `Open to ${required} citizens only, and this employer does not sponsor a visa.`,
    });
  } else if (profile.needsVisaSponsorship && !program.visaSponsored) {
    reasons.push({
      code: 'citizenship',
      sentence: 'You said you need visa sponsorship, and this employer does not sponsor one.',
    });
  }

  return reasons;
}

export function isEligible(program: Program, profile: Profile): boolean {
  return eligibilityReasons(program, profile).length === 0;
}

// ---------------------------------------------------------------------------
// Stage two: the four components
// ---------------------------------------------------------------------------

function scoreFieldAlignment(program: Program, profile: Profile): FitComponentDetail {
  const named = program.degreeFields.includes(profile.degreeField);
  const breadth = program.degreeFields.length;
  let earned: number;
  let note: string;

  if (named && breadth <= 3) {
    earned = 35;
    note = `${profile.degreeField} is one of only ${breadth} ${
      breadth === 1 ? 'degree' : 'degrees'
    } this programme names, so it is aimed squarely at you.`;
  } else if (named && breadth <= 7) {
    earned = 28;
    note = `${profile.degreeField} is named directly, alongside ${breadth - 1} other ${
      breadth - 1 === 1 ? 'field' : 'fields'
    }.`;
  } else if (named && breadth <= 11) {
    earned = 22;
    note = `${profile.degreeField} is named, but so are ${breadth - 1} other fields, so the intake is fairly broad.`;
  } else if (named) {
    earned = 18;
    note = `${profile.degreeField} is named, but this programme takes ${breadth} fields in total, which is close to open to any degree.`;
  } else if (isAdjacentField(profile.degreeField, program.degreeFields)) {
    earned = 12;
    note = `${profile.degreeField} is not on the list, though it sits close to fields that are.`;
  } else {
    earned = 0;
    note = `${profile.degreeField} is not on this programme's list of degrees.`;
  }

  return { key: 'fieldAlignment', label: COMPONENT_LABEL.fieldAlignment, earned, max: 35, note };
}

function scoreCgpaHeadroom(program: Program, profile: Profile): FitComponentDetail {
  if (program.minCGPA === null) {
    return {
      key: 'cgpaHeadroom',
      label: COMPONENT_LABEL.cgpaHeadroom,
      earned: 12,
      max: 20,
      note: 'No published minimum, so this scores mid-range rather than full marks. We cannot give credit for clearing a bar nobody stated.',
    };
  }

  const headroom = profile.cgpa - program.minCGPA;

  if (headroom < 0) {
    return {
      key: 'cgpaHeadroom',
      label: COMPONENT_LABEL.cgpaHeadroom,
      earned: 0,
      max: 20,
      note: `Your ${formatCgpa(profile.cgpa)} is below the stated ${formatCgpa(program.minCGPA)} minimum.`,
    };
  }

  const earned = Math.round(Math.min(20, 8 + (headroom / COMFORTABLE_MARGIN) * 12));
  const note =
    headroom === 0
      ? `Your ${formatCgpa(profile.cgpa)} sits exactly on the ${formatCgpa(program.minCGPA)} minimum, with nothing to spare.`
      : `Your ${formatCgpa(profile.cgpa)} clears the ${formatCgpa(program.minCGPA)} minimum by ${headroom.toFixed(2)}.${
          headroom >= COMFORTABLE_MARGIN ? ' That is comfortable margin.' : ''
        }`;

  return { key: 'cgpaHeadroom', label: COMPONENT_LABEL.cgpaHeadroom, earned, max: 20, note };
}

function scoreLocationFit(program: Program, profile: Profile): FitComponentDetail {
  const label = COMPONENT_LABEL.locationFit;

  if (profile.preferredCities.length === 0) {
    return {
      key: 'locationFit',
      label,
      earned: 14,
      max: 25,
      note: 'You did not name a preferred city, so location scores neutrally rather than for or against.',
    };
  }

  const matches = program.cities.filter((city) => profile.preferredCities.includes(city));

  if (matches.length > 0) {
    return {
      key: 'locationFit',
      label,
      earned: 25,
      max: 25,
      note: `Based in ${matches.join(' and ')}, which ${
        matches.length === 1 ? 'is a city' : 'are cities'
      } you picked.`,
    };
  }

  const preferredCountries = new Set(
    profile.preferredCities.map(countryOf).filter((value): value is 'MY' | 'SG' => Boolean(value)),
  );

  if (preferredCountries.has(program.country)) {
    return {
      key: 'locationFit',
      label,
      earned: 14,
      max: 25,
      note: `Based in ${program.cities.join(', ')}, which you did not pick, but still in ${
        COUNTRY_LABEL[program.country]
      }.`,
    };
  }

  return {
    key: 'locationFit',
    label,
    earned: 0,
    max: 25,
    note: `Based in ${program.cities.join(', ')}, which is outside the cities and the country you picked.`,
  };
}

function scoreSectorInterest(program: Program, profile: Profile): FitComponentDetail {
  const label = COMPONENT_LABEL.sectorInterest;
  const sectorName = SECTOR_LABEL[program.sector];

  if (profile.sectorsOfInterest.length === 0) {
    return {
      key: 'sectorInterest',
      label,
      earned: 10,
      max: 20,
      note: 'You did not pick any sectors, so sector scores neutrally for every programme.',
    };
  }

  if (profile.sectorsOfInterest.includes(program.sector)) {
    return {
      key: 'sectorInterest',
      label,
      earned: 20,
      max: 20,
      note: `${sectorName} is one of the sectors you picked.`,
    };
  }

  return {
    key: 'sectorInterest',
    label,
    earned: 0,
    max: 20,
    note: `You did not pick ${sectorName}. You are still eligible, so it stays on the list — just ranked below the sectors you chose.`,
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Score one programme against one profile. Pure: same inputs, same output.
 *
 * Ineligible programmes come back with `eligible: false`, their reasons, and a
 * total of zero — the shortlist shows the reasons instead of a score, because
 * ranking something a student cannot apply to would be noise.
 */
export function scoreProgram(program: Program, profile: Profile): FitResult {
  const reasons = eligibilityReasons(program, profile);
  const eligible = reasons.length === 0;

  const breakdown: FitComponentDetail[] = [
    scoreFieldAlignment(program, profile),
    scoreCgpaHeadroom(program, profile),
    scoreLocationFit(program, profile),
    scoreSectorInterest(program, profile),
  ];

  const components: FitComponents = {
    fieldAlignment: breakdown[0].earned,
    cgpaHeadroom: breakdown[1].earned,
    locationFit: breakdown[2].earned,
    sectorInterest: breakdown[3].earned,
  };

  const total = eligible
    ? components.fieldAlignment +
      components.cgpaHeadroom +
      components.locationFit +
      components.sectorInterest
    : 0;

  return { programId: program.id, eligible, reasons, total, components, breakdown };
}

export interface ScoredProgram {
  program: Program;
  fit: FitResult;
}

/**
 * Score every programme and split it into the ranked eligible list and the
 * ineligible list. Ties break on employer then programme name so the order is
 * stable between renders.
 */
export function scoreAll(
  programs: Program[],
  profile: Profile,
): { eligible: ScoredProgram[]; ineligible: ScoredProgram[] } {
  const scored = programs.map((program) => ({ program, fit: scoreProgram(program, profile) }));

  const eligible = scored
    .filter((entry) => entry.fit.eligible)
    .sort(
      (a, b) =>
        b.fit.total - a.fit.total ||
        a.program.employer.localeCompare(b.program.employer) ||
        a.program.name.localeCompare(b.program.name),
    );

  const ineligible = scored
    .filter((entry) => !entry.fit.eligible)
    .sort(
      (a, b) =>
        a.fit.reasons.length - b.fit.reasons.length ||
        a.program.employer.localeCompare(b.program.employer) ||
        a.program.name.localeCompare(b.program.name),
    );

  return { eligible, ineligible };
}

/** A one-line, non-numeric reading of a total. Never a prediction of an outcome. */
export function fitBand(total: number): string {
  if (total >= 85) return 'Very close match';
  if (total >= 70) return 'Close match';
  if (total >= 55) return 'Partial match';
  return 'Loose match';
}
