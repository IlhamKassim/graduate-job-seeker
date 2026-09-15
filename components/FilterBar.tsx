'use client';

import type { Sector, WindowStatus } from '@/types';
import { COUNTRY_LABEL, SECTOR_LABEL } from '@/data/taxonomy';
import { WINDOW_STATUS_LABEL, WINDOW_STATUS_ORDER } from '@/lib/windows';
import {
  TESTID,
  filterCountryId,
  filterSectorId,
  filterStatusId,
} from '@/lib/testids';

export interface Filters {
  sectors: Sector[];
  countries: ('MY' | 'SG')[];
  statuses: WindowStatus[];
}

export const NO_FILTERS: Filters = { sectors: [], countries: [], statuses: [] };

export function filtersActive(filters: Filters): number {
  return filters.sectors.length + filters.countries.length + filters.statuses.length;
}

function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
      <span className="shrink-0 pt-1 font-mono text-[0.75rem] text-slate sm:w-14">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

/**
 * Only offers filters the current results can actually use. A chip for a sector
 * with nothing behind it is a dead end, so it is not drawn.
 */
export function FilterBar({
  filters,
  onChange,
  availableSectors,
  availableCountries,
  availableStatuses,
  resultCount,
  totalCount,
  statusesKnown,
  includeSamples,
  sampleCount,
  onToggleSamples,
}: {
  filters: Filters;
  onChange: (
    next: Filters,
    kind: 'sector' | 'country' | 'status' | 'reset',
    value: string | null,
    active: boolean,
  ) => void;
  availableSectors: Sector[];
  availableCountries: ('MY' | 'SG')[];
  availableStatuses: WindowStatus[];
  resultCount: number;
  totalCount: number;
  statusesKnown: boolean;
  includeSamples: boolean;
  sampleCount: number;
  onToggleSamples: (included: boolean) => void;
}) {
  const active = filtersActive(filters);

  const toggle = <T extends string>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];

  return (
    <div className="rule-bottom flex flex-col gap-3 py-3">
      {availableSectors.length > 1 ? (
        <Group label="Sector">
          {availableSectors.map((sector) => {
            const on = filters.sectors.includes(sector);
            return (
              <button
                key={sector}
                type="button"
                data-testid={filterSectorId(sector)}
                aria-pressed={on}
                className="chip-filter"
                onClick={() =>
                  onChange(
                    { ...filters, sectors: toggle(filters.sectors, sector) },
                    'sector',
                    sector,
                    !on,
                  )
                }
              >
                {SECTOR_LABEL[sector]}
              </button>
            );
          })}
        </Group>
      ) : null}

      {availableCountries.length > 1 ? (
        <Group label="Country">
          {availableCountries.map((country) => {
            const on = filters.countries.includes(country);
            return (
              <button
                key={country}
                type="button"
                data-testid={filterCountryId(country)}
                aria-pressed={on}
                className="chip-filter"
                onClick={() =>
                  onChange(
                    { ...filters, countries: toggle(filters.countries, country) },
                    'country',
                    country,
                    !on,
                  )
                }
              >
                {COUNTRY_LABEL[country]}
              </button>
            );
          })}
        </Group>
      ) : null}

      {statusesKnown && availableStatuses.length > 1 ? (
        <Group label="Window">
          {WINDOW_STATUS_ORDER.filter((status) => availableStatuses.includes(status)).map(
            (status) => {
              const on = filters.statuses.includes(status);
              return (
                <button
                  key={status}
                  type="button"
                  data-testid={filterStatusId(status)}
                  aria-pressed={on}
                  className="chip-filter"
                  onClick={() =>
                    onChange(
                      { ...filters, statuses: toggle(filters.statuses, status) },
                      'status',
                      status,
                      !on,
                    )
                  }
                >
                  {status === 'open' ? (
                    <span aria-hidden className="h-1.5 w-1.5 bg-signal outline outline-1 outline-current" />
                  ) : null}
                  {WINDOW_STATUS_LABEL[status]}
                </button>
              );
            },
          )}
        </Group>
      ) : null}

      {sampleCount > 0 ? (
        <Group label="Data">
          <button
            type="button"
            data-testid="filter-samples"
            aria-pressed={includeSamples}
            className="chip-filter"
            onClick={() => onToggleSamples(!includeSamples)}
          >
            {includeSamples ? `Hide ${sampleCount} samples` : `Show ${sampleCount} samples`}
          </button>
        </Group>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-0.5">
        <p aria-live="polite" className="font-mono text-[0.75rem] text-slate">
          Showing <span className="tabular text-ink">{resultCount}</span> of{' '}
          <span className="tabular">{totalCount}</span> eligible
          {active > 0 ? ` · ${active} ${active === 1 ? 'filter' : 'filters'} on` : ''}
        </p>
        <button
          type="button"
          data-testid={TESTID.filterReset}
          className="min-h-11 font-mono text-[0.75rem] text-ink underline underline-offset-4 hover:decoration-2 disabled:text-slate disabled:no-underline"
          onClick={() => onChange(NO_FILTERS, 'reset', null, false)}
          disabled={active === 0}
        >
          Clear filters
        </button>
      </div>
    </div>
  );
}
