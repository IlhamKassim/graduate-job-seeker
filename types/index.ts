export type AssessmentStage =
  | 'online_application'
  | 'aptitude_test'
  | 'video_interview'
  | 'technical_test'
  | 'assessment_centre'
  | 'panel_interview'
  | 'final_interview';

export type DataConfidence = 'verified' | 'unverified';

export interface Program {
  id: string;
  name: string;
  employer: string;
  sector:
    | 'banking'
    | 'tech'
    | 'semiconductor'
    | 'consulting'
    | 'fmcg'
    | 'energy'
    | 'telco'
    | 'government';
  cities: string[];
  country: 'MY' | 'SG';
  opensMonth: number;
  closesMonth: number;
  minCGPA: number | null;
  degreeFields: string[];
  citizenshipRequired: 'MY' | 'SG' | 'any';
  visaSponsored: boolean;
  stages: { stage: AssessmentStage; note: string }[];
  typicalProcessWeeks: number;
  sourceUrl: string;
  dataConfidence: DataConfidence;
}

export interface Profile {
  degreeField: string;
  cgpa: number;
  graduationMonth: number;
  graduationYear: number;
  preferredCities: string[];
  sectorsOfInterest: Program['sector'][];
  citizenship: 'MY' | 'SG' | 'other';
  needsVisaSponsorship: boolean;
}

export type Sector = Program['sector'];

/** Where a program's application window sits relative to today. */
export type WindowStatus = 'open' | 'opening_soon' | 'closed';

/** Why the hard eligibility gate rejected a program. One reason per failing rule. */
export type IneligibilityCode = 'cgpa' | 'field' | 'citizenship';

export interface IneligibilityReason {
  code: IneligibilityCode;
  /** One plain sentence, already formatted for display. */
  sentence: string;
}

export interface FitComponents {
  /** 0-35 */
  fieldAlignment: number;
  /** 0-20 */
  cgpaHeadroom: number;
  /** 0-25 */
  locationFit: number;
  /** 0-20 */
  sectorInterest: number;
}

export interface FitComponentDetail {
  key: keyof FitComponents;
  label: string;
  earned: number;
  max: number;
  /** One plain sentence explaining how this component was earned. */
  note: string;
}

export interface FitResult {
  programId: string;
  eligible: boolean;
  /** Populated only when `eligible` is false. */
  reasons: IneligibilityReason[];
  /** 0-100, the sum of the four components. Zero when ineligible. */
  total: number;
  components: FitComponents;
  /** Display-ready breakdown, always four entries in a fixed order. */
  breakdown: FitComponentDetail[];
}
