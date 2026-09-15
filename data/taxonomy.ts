import type { Sector } from '@/types';

/**
 * The canonical vocabulary. The profile form, the seed programmes and the fit
 * scorer all read from here, so a field or city only ever has one spelling.
 */

export const CITIES = [
  'Kuala Lumpur',
  'Penang',
  'Johor',
  'Kota Kinabalu',
  'Singapore',
] as const;

export type City = (typeof CITIES)[number];

export const CITY_COUNTRY: Record<City, 'MY' | 'SG'> = {
  'Kuala Lumpur': 'MY',
  Penang: 'MY',
  Johor: 'MY',
  'Kota Kinabalu': 'MY',
  Singapore: 'SG',
};

export const DEGREE_FIELDS = [
  'Accounting',
  'Actuarial Science',
  'Business Administration',
  'Chemical Engineering',
  'Civil Engineering',
  'Computer Science',
  'Data Science',
  'Economics',
  'Electrical & Electronic Engineering',
  'Environmental Science',
  'Finance',
  'Human Resource Management',
  'Information Systems',
  'Law',
  'Marketing',
  'Mathematics',
  'Mechanical Engineering',
  'Physics',
  'Political Science',
  'Psychology',
  'Public Administration',
  'Software Engineering',
  'Statistics',
  'Supply Chain Management',
] as const;

export type DegreeField = (typeof DEGREE_FIELDS)[number];

/**
 * Fields that sit close enough to each other that a graduate of one is a
 * credible applicant to a programme asking for the other. Used for partial
 * credit in field alignment only — it never opens the hard eligibility gate.
 * Symmetric: `adjacency[a]` contains b if and only if `adjacency[b]` contains a.
 */
export const FIELD_ADJACENCY: Record<string, string[]> = {
  Accounting: ['Finance', 'Economics', 'Business Administration', 'Actuarial Science'],
  'Actuarial Science': ['Mathematics', 'Statistics', 'Finance', 'Economics', 'Accounting'],
  'Business Administration': [
    'Marketing',
    'Economics',
    'Human Resource Management',
    'Supply Chain Management',
    'Accounting',
    'Finance',
  ],
  'Chemical Engineering': ['Mechanical Engineering', 'Environmental Science', 'Physics'],
  'Civil Engineering': ['Mechanical Engineering', 'Environmental Science'],
  'Computer Science': ['Software Engineering', 'Data Science', 'Information Systems', 'Mathematics'],
  'Data Science': ['Statistics', 'Computer Science', 'Mathematics', 'Information Systems'],
  Economics: [
    'Finance',
    'Statistics',
    'Political Science',
    'Business Administration',
    'Accounting',
    'Actuarial Science',
    'Mathematics',
  ],
  'Electrical & Electronic Engineering': [
    'Physics',
    'Mechanical Engineering',
    'Computer Science',
    'Software Engineering',
  ],
  'Environmental Science': ['Chemical Engineering', 'Civil Engineering', 'Physics'],
  Finance: ['Accounting', 'Economics', 'Actuarial Science', 'Business Administration', 'Mathematics'],
  'Human Resource Management': ['Psychology', 'Business Administration', 'Public Administration'],
  'Information Systems': ['Computer Science', 'Software Engineering', 'Data Science', 'Business Administration'],
  Law: ['Political Science', 'Public Administration'],
  Marketing: ['Business Administration', 'Psychology', 'Economics'],
  Mathematics: ['Statistics', 'Physics', 'Data Science', 'Actuarial Science', 'Computer Science', 'Economics', 'Finance'],
  'Mechanical Engineering': [
    'Electrical & Electronic Engineering',
    'Chemical Engineering',
    'Civil Engineering',
    'Physics',
  ],
  Physics: [
    'Mathematics',
    'Electrical & Electronic Engineering',
    'Mechanical Engineering',
    'Chemical Engineering',
    'Environmental Science',
  ],
  'Political Science': ['Public Administration', 'Law', 'Economics'],
  Psychology: ['Human Resource Management', 'Marketing'],
  'Public Administration': ['Political Science', 'Law', 'Human Resource Management'],
  'Software Engineering': ['Computer Science', 'Information Systems', 'Electrical & Electronic Engineering'],
  Statistics: ['Mathematics', 'Data Science', 'Economics', 'Actuarial Science'],
  'Supply Chain Management': ['Business Administration', 'Economics'],
};

export const SECTORS: Sector[] = [
  'banking',
  'tech',
  'semiconductor',
  'consulting',
  'fmcg',
  'energy',
  'telco',
  'government',
];

export const SECTOR_LABEL: Record<Sector, string> = {
  banking: 'Banking',
  tech: 'Tech',
  semiconductor: 'Semiconductor',
  consulting: 'Consulting',
  fmcg: 'FMCG',
  energy: 'Energy',
  telco: 'Telco',
  government: 'Government',
};

export const MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const COUNTRY_LABEL: Record<'MY' | 'SG', string> = {
  MY: 'Malaysia',
  SG: 'Singapore',
};
