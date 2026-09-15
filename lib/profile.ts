import type { Profile, Sector } from '@/types';
import { CITIES, DEGREE_FIELDS, SECTORS } from '@/data/taxonomy';

/**
 * The seven answers, accepted only when every field is a known taxonomy value.
 * Used by localStorage and by the return-visit store so a crafted payload
 * cannot smuggle a free-text degree or an out-of-range CGPA onto the server.
 */
export function parseProfile(value: unknown): Profile | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<Profile>;

  if (typeof candidate.degreeField !== 'string') return null;
  if (!(DEGREE_FIELDS as readonly string[]).includes(candidate.degreeField)) return null;
  if (typeof candidate.cgpa !== 'number' || Number.isNaN(candidate.cgpa)) return null;
  if (candidate.cgpa < 0 || candidate.cgpa > 4) return null;
  if (typeof candidate.graduationMonth !== 'number') return null;
  if (candidate.graduationMonth < 1 || candidate.graduationMonth > 12) return null;
  if (typeof candidate.graduationYear !== 'number') return null;
  if (!Array.isArray(candidate.preferredCities)) return null;
  if (!candidate.preferredCities.every((city) => (CITIES as readonly string[]).includes(city))) {
    return null;
  }
  if (!Array.isArray(candidate.sectorsOfInterest)) return null;
  if (!candidate.sectorsOfInterest.every((sector) => SECTORS.includes(sector as Sector))) {
    return null;
  }
  if (!['MY', 'SG', 'other'].includes(candidate.citizenship as string)) return null;
  if (typeof candidate.needsVisaSponsorship !== 'boolean') return null;

  return {
    degreeField: candidate.degreeField,
    cgpa: candidate.cgpa,
    graduationMonth: candidate.graduationMonth,
    graduationYear: candidate.graduationYear,
    preferredCities: [...candidate.preferredCities],
    sectorsOfInterest: [...candidate.sectorsOfInterest] as Profile['sectorsOfInterest'],
    citizenship: candidate.citizenship as Profile['citizenship'],
    needsVisaSponsorship: candidate.needsVisaSponsorship,
  };
}

export function parseProgrammeIds(value: unknown, knownIds: Iterable<string>): string[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(knownIds);
  const unique: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || !allowed.has(entry)) continue;
    if (unique.includes(entry)) continue;
    unique.push(entry);
    if (unique.length >= 40) break;
  }
  return unique;
}
