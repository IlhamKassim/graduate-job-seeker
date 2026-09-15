'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Profile, Sector } from '@/types';
import { CITIES, DEGREE_FIELDS, MONTH_LONG, SECTORS, SECTOR_LABEL } from '@/data/taxonomy';
import { loadProfile, saveProfile, storageAvailable } from '@/lib/storage';
import { trackProfileSubmitted } from '@/lib/analytics';
import { FormField } from '@/components/FormField';
import {
  TESTID,
  citizenshipFieldId,
  cityFieldId,
  sectorFieldId,
} from '@/lib/testids';

interface Draft {
  degreeField: string;
  cgpa: string;
  graduationMonth: string;
  graduationYear: string;
  preferredCities: string[];
  sectorsOfInterest: Sector[];
  citizenship: '' | 'MY' | 'SG' | 'other';
  needsVisaSponsorship: boolean;
}

const EMPTY: Draft = {
  degreeField: '',
  cgpa: '',
  graduationMonth: '',
  graduationYear: '',
  preferredCities: [],
  sectorsOfInterest: [],
  citizenship: '',
  needsVisaSponsorship: false,
};

type FieldName = keyof Draft;

type Errors = Partial<Record<FieldName, string>>;

const FIELD_ORDER: FieldName[] = [
  'degreeField',
  'cgpa',
  'graduationMonth',
  'preferredCities',
  'sectorsOfInterest',
  'citizenship',
  'needsVisaSponsorship',
];

const FIELD_ANCHOR: Record<FieldName, string> = {
  degreeField: 'degree-field',
  cgpa: 'cgpa',
  graduationMonth: 'graduation-month',
  graduationYear: 'graduation-year',
  preferredCities: 'cities-group',
  sectorsOfInterest: 'sectors-group',
  citizenship: 'citizenship-group',
  needsVisaSponsorship: 'visa',
};

function validate(draft: Draft): Errors {
  const errors: Errors = {};

  if (!draft.degreeField) {
    errors.degreeField = 'Pick your degree field so we can check which programmes accept it.';
  }

  if (draft.cgpa.trim() === '') {
    errors.cgpa = 'Enter your CGPA. It decides which minimums you clear.';
  } else {
    const value = Number(draft.cgpa);
    if (Number.isNaN(value)) {
      errors.cgpa = 'Enter your CGPA as a number, like 3.42.';
    } else if (value < 0 || value > 4) {
      errors.cgpa = 'CGPA must be between 0.00 and 4.00 on the 4-point scale.';
    }
  }

  if (!draft.graduationMonth || !draft.graduationYear) {
    errors.graduationMonth = 'Pick the month and year you graduate. The calendar marks it.';
  }

  if (draft.preferredCities.length === 0) {
    errors.preferredCities = 'Pick at least one city. Location is a quarter of the fit score.';
  }

  if (!draft.citizenship) {
    errors.citizenship = 'Pick your citizenship. Some programmes are closed without it.';
  }

  return errors;
}

function stepSelectValue(current: string, values: readonly string[], key: string): string | null {
  if (key !== 'ArrowDown' && key !== 'ArrowUp') return null;
  const index = values.indexOf(current);
  if (key === 'ArrowDown') {
    if (index < 0) return values[0] ?? current;
    return values[Math.min(values.length - 1, index + 1)];
  }
  if (index < 0) return values[0] ?? current;
  return values[Math.max(0, index - 1)];
}

const YEAR_OPTIONS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export function ProfileForm() {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);
  const [hadSavedProfile, setHadSavedProfile] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = loadProfile();
    if (saved) {
      setHadSavedProfile(true);
      setDraft({
        degreeField: saved.degreeField,
        cgpa: saved.cgpa.toFixed(2),
        graduationMonth: String(saved.graduationMonth),
        graduationYear: String(saved.graduationYear),
        preferredCities: saved.preferredCities,
        sectorsOfInterest: saved.sectorsOfInterest,
        citizenship: saved.citizenship,
        needsVisaSponsorship: saved.needsVisaSponsorship,
      });
    }
    setStorageBlocked(!storageAvailable());
  }, []);

  const update = <K extends FieldName>(key: K, value: Draft[K]) => {
    const next = { ...draft, [key]: value } as Draft;
    setDraft(next);
    // Once errors are on screen, clearing one the moment it is fixed is the
    // whole point of having shown it.
    if (submitted) setErrors(validate(next));
  };

  const toggleCity = (city: string) => {
    const next = draft.preferredCities.includes(city)
      ? draft.preferredCities.filter((value) => value !== city)
      : [...draft.preferredCities, city];
    update('preferredCities', next);
  };

  const toggleSector = (sector: Sector) => {
    const next = draft.sectorsOfInterest.includes(sector)
      ? draft.sectorsOfInterest.filter((value) => value !== sector)
      : [...draft.sectorsOfInterest, sector];
    update('sectorsOfInterest', next);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitted(true);

    const found = validate(draft);
    setErrors(found);

    const firstBroken = FIELD_ORDER.find((name) => found[name]);
    if (firstBroken) {
      const anchor = document.getElementById(FIELD_ANCHOR[firstBroken]);
      const focusTarget =
        anchor instanceof HTMLInputElement ||
        anchor instanceof HTMLSelectElement ||
        anchor instanceof HTMLButtonElement
          ? anchor
          : (anchor?.querySelector<HTMLElement>('input, select, button') ?? anchor);
      focusTarget?.focus();
      focusTarget?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    const profile: Profile = {
      degreeField: draft.degreeField,
      cgpa: Number(draft.cgpa),
      graduationMonth: Number(draft.graduationMonth),
      graduationYear: Number(draft.graduationYear),
      preferredCities: draft.preferredCities,
      sectorsOfInterest: draft.sectorsOfInterest,
      citizenship: draft.citizenship as 'MY' | 'SG' | 'other',
      needsVisaSponsorship: draft.needsVisaSponsorship,
    };

    saveProfile(profile);
    trackProfileSubmitted(profile);
    window.location.assign('/shortlist/');
  };

  const errorList = FIELD_ORDER.filter((name) => errors[name]);

  return (
    <form
      data-testid={TESTID.profileForm}
      onSubmit={handleSubmit}
      noValidate
      aria-describedby={errorList.length > 0 ? TESTID.formErrorSummary : undefined}
    >
      {storageBlocked ? (
        <div className="mb-6 border border-oxblood bg-white p-3 text-[0.875rem] leading-snug text-oxblood">
          This browser is not letting the page save anything. You can still fill the form and
          see your shortlist, but it will be gone when you close the tab.
        </div>
      ) : null}

      {errorList.length > 0 ? (
        <div
          ref={summaryRef}
          id={TESTID.formErrorSummary}
          data-testid={TESTID.formErrorSummary}
          role="alert"
          tabIndex={-1}
          className="animate-reveal mb-6 border-2 border-oxblood bg-white p-4"
        >
          <p className="text-[0.9375rem] font-medium text-oxblood">
            {errorList.length === 1
              ? 'One answer needs fixing before we can build your shortlist.'
              : `${errorList.length} answers need fixing before we can build your shortlist.`}
          </p>
          <ul className="mt-2 flex flex-col gap-2">
            {errorList.map((name) => (
              <li key={name}>
                <a
                  href={`#${FIELD_ANCHOR[name]}`}
                  className="text-link text-[0.875rem] text-oxblood"
                >
                  {errors[name]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hadSavedProfile ? (
        <p className="mb-6 border border-rule bg-surface p-3 text-[0.875rem] leading-snug text-ink-80">
          Your saved answers are filled in below. Change anything and submit again, or{' '}
          <Link href="/" className="text-link">
              go straight to your shortlist
            </Link>
          .
        </p>
      ) : null}

      <FormField
        index={1}
        label="Your degree field"
        htmlFor="degree-field"
        hint="Pick the closest match. Programmes list the exact fields they take."
        error={errors.degreeField}
        errorId="degree-field-error"
      >
        <select
          id="degree-field"
          data-testid={TESTID.fieldDegree}
          className="field-control"
          value={draft.degreeField}
          onChange={(event) => update('degreeField', event.target.value)}
          onKeyDown={(event) => {
            const next = stepSelectValue(draft.degreeField, DEGREE_FIELDS, event.key);
            if (next === null || next === draft.degreeField) return;
            event.preventDefault();
            update('degreeField', next);
          }}
          aria-invalid={Boolean(errors.degreeField)}
          aria-describedby={errors.degreeField ? 'degree-field-error' : undefined}
        >
          <option value="">Choose a field</option>
          {DEGREE_FIELDS.map((field) => (
            <option key={field} value={field}>
              {field}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        index={2}
        label="Your CGPA"
        htmlFor="cgpa"
        hint="On the 4.00 scale. An estimate is fine — you can change it later."
        error={errors.cgpa}
        errorId="cgpa-error"
      >
        <input
          id="cgpa"
          data-testid={TESTID.fieldCgpa}
          className="field-control font-mono tabular max-w-[10rem]"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="3.42"
          value={draft.cgpa}
          onChange={(event) => update('cgpa', event.target.value)}
          aria-invalid={Boolean(errors.cgpa)}
          aria-describedby={errors.cgpa ? 'cgpa-error' : undefined}
        />
      </FormField>

      <FormField
        index={3}
        label="When you graduate"
        hint="The calendar draws a line here so you can see which windows land before it."
        error={errors.graduationMonth}
        errorId="graduation-error"
      >
        <div className="flex flex-wrap gap-3" id="graduation-group">
          <div className="min-w-0 flex-1">
            <label htmlFor="graduation-month" className="sr-only-focusable">
              Graduation month
            </label>
            <select
              id="graduation-month"
              data-testid={TESTID.fieldGradMonth}
              className="field-control"
              aria-label="Graduation month"
              value={draft.graduationMonth}
              onChange={(event) => update('graduationMonth', event.target.value)}
              onKeyDown={(event) => {
                const months = MONTH_LONG.map((_, index) => String(index + 1));
                const next = stepSelectValue(draft.graduationMonth, months, event.key);
                if (next === null || next === draft.graduationMonth) return;
                event.preventDefault();
                update('graduationMonth', next);
              }}
              aria-invalid={Boolean(errors.graduationMonth)}
              aria-describedby={errors.graduationMonth ? 'graduation-error' : undefined}
            >
              <option value="">Month</option>
              {MONTH_LONG.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-1">
            <select
              id="graduation-year"
              data-testid={TESTID.fieldGradYear}
              className="field-control font-mono tabular"
              aria-label="Graduation year"
              value={draft.graduationYear}
              onChange={(event) => update('graduationYear', event.target.value)}
              onKeyDown={(event) => {
                const years = YEAR_OPTIONS.map(String);
                const next = stepSelectValue(draft.graduationYear, years, event.key);
                if (next === null || next === draft.graduationYear) return;
                event.preventDefault();
                update('graduationYear', next);
              }}
              aria-invalid={Boolean(errors.graduationMonth)}
              aria-describedby={errors.graduationMonth ? 'graduation-error' : undefined}
            >
              <option value="">Year</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FormField>

      <FormField
        index={4}
        label="Where you would work"
        hint="Pick as many as you would genuinely move for."
        error={errors.preferredCities}
        errorId="cities-error"
      >
        <fieldset
          id="cities-group"
          aria-describedby={errors.preferredCities ? 'cities-error' : undefined}
        >
          <legend className="sr-only-focusable">Preferred cities</legend>
          <div className="grid grid-cols-1 gap-2 xs:grid-cols-2 sm:grid-cols-3">
            {CITIES.map((city) => (
              <label key={city} className="tick-option">
                <input
                  type="checkbox"
                  data-testid={cityFieldId(city)}
                  checked={draft.preferredCities.includes(city)}
                  onChange={() => toggleCity(city)}
                />
                <span aria-hidden className="tick-box" />
                <span className="text-[0.875rem] leading-tight">{city}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </FormField>

      <FormField
        index={5}
        label="Sectors you are interested in"
        hint="Leave it blank if you are open to anything. Sector is a fifth of the fit score."
        optional
      >
        <fieldset id="sectors-group">
          <legend className="sr-only-focusable">Sectors of interest</legend>
          <div className="grid grid-cols-1 gap-2 xs:grid-cols-2 sm:grid-cols-3">
            {SECTORS.map((sector) => (
              <label key={sector} className="tick-option">
                <input
                  type="checkbox"
                  data-testid={sectorFieldId(sector)}
                  checked={draft.sectorsOfInterest.includes(sector)}
                  onChange={() => toggleSector(sector)}
                />
                <span aria-hidden className="tick-box" />
                <span className="text-[0.875rem] leading-tight">{SECTOR_LABEL[sector]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </FormField>

      <FormField
        index={6}
        label="Your citizenship"
        error={errors.citizenship}
        errorId="citizenship-error"
      >
        <fieldset
          id="citizenship-group"
          aria-describedby={errors.citizenship ? 'citizenship-error' : undefined}
        >
          <legend className="sr-only-focusable">Citizenship</legend>
          <div className="grid grid-cols-1 gap-2 xs:grid-cols-3">
            {(
              [
                { value: 'MY', label: 'Malaysian' },
                { value: 'SG', label: 'Singaporean' },
                { value: 'other', label: 'Somewhere else' },
              ] as const
            ).map((option) => (
              <label key={option.value} className="tick-option tick-option--radio">
                <input
                  type="radio"
                  data-testid={citizenshipFieldId(option.value)}
                  value={option.value}
                  checked={draft.citizenship === option.value}
                  onChange={() => update('citizenship', option.value)}
                />
                <span aria-hidden className="tick-box" />
                <span className="text-[0.875rem] leading-tight">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </FormField>

      <FormField
        index={7}
        label="Do you need visa sponsorship?"
        hint="Tick this if you would need the employer to sponsor a work pass."
      >
        <label className="tick-option max-w-sm">
          <input
            id="visa"
            type="checkbox"
            data-testid={TESTID.fieldVisa}
            checked={draft.needsVisaSponsorship}
            onChange={(event) => update('needsVisaSponsorship', event.target.checked)}
          />
          <span aria-hidden className="tick-box" />
          <span className="text-[0.875rem] leading-tight">Yes, I need sponsorship</span>
        </label>
      </FormField>

      <div className="rule-top flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[44ch] text-[0.8125rem] leading-snug text-slate">
          Your answers stay in this browser. There is no account. A waitlist address is only sent
          if you leave one later, with consent.
        </p>
        <button type="submit" data-testid={TESTID.profileSubmit} className="btn btn-primary">
          {hadSavedProfile ? 'Update and see my shortlist' : 'See my shortlist'}
        </button>
      </div>
    </form>
  );
}
