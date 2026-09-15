'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Sector, WindowStatus } from '@/types';
import { catalog, SAMPLE_COUNT } from '@/lib/catalog';
import { MONTH_LONG } from '@/data/taxonomy';
import { scoreAll } from '@/lib/fit';
import { resolveWindow, closingSoonInfo } from '@/lib/windows';
import { trackFilterUsed, trackShortlistViewed } from '@/lib/analytics';
import { useNow, useProfile, useSamplesIncluded } from '@/lib/hooks';
import { setSamplesIncluded } from '@/lib/storage';
import { FilterBar, NO_FILTERS, type Filters } from '@/components/FilterBar';
import { ShortlistRow } from '@/components/ShortlistRow';
import { IneligibleSection } from '@/components/IneligibleSection';
import { EmailCapture } from '@/components/EmailCapture';
import { ClosingSoonStrip } from '@/components/ClosingSoonStrip';
import { TESTID } from '@/lib/testids';

type SortKey = 'fit' | 'soonest';

export function ShortlistView() {
  const { profile, ready } = useProfile();
  const { included: includeSamples } = useSamplesIncluded();
  const now = useNow();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<SortKey>('fit');
  const reported = useRef(false);

  const scored = useMemo(
    () =>
      profile
        ? scoreAll(catalog(includeSamples), profile)
        : { eligible: [], ineligible: [] },
    [profile, includeSamples],
  );

  useEffect(() => {
    if (!ready || !profile || reported.current) return;
    reported.current = true;
    trackShortlistViewed({
      eligible: scored.eligible.length,
      ineligible: scored.ineligible.length,
    });
  }, [ready, profile, scored.eligible.length, scored.ineligible.length]);

  const withWindows = useMemo(
    () =>
      scored.eligible.map((entry) => ({
        ...entry,
        window: now ? resolveWindow(entry.program, now) : null,
      })),
    [scored.eligible, now],
  );

  const filtered = useMemo(() => {
    const next = withWindows.filter((entry) => {
      if (filters.sectors.length > 0 && !filters.sectors.includes(entry.program.sector)) {
        return false;
      }
      if (filters.countries.length > 0 && !filters.countries.includes(entry.program.country)) {
        return false;
      }
      if (filters.statuses.length > 0) {
        if (!entry.window || !filters.statuses.includes(entry.window.status)) return false;
      }
      return true;
    });

    if (sort === 'soonest' && now) {
      return [...next].sort(
        (a, b) =>
          (a.window?.monthsUntilOpen ?? 99) - (b.window?.monthsUntilOpen ?? 99) ||
          b.fit.total - a.fit.total ||
          a.program.employer.localeCompare(b.program.employer),
      );
    }
    return next;
  }, [withWindows, filters, sort, now]);

  const availableSectors = useMemo(
    () => [...new Set(withWindows.map((entry) => entry.program.sector))].sort() as Sector[],
    [withWindows],
  );
  const availableCountries = useMemo(
    () => [...new Set(withWindows.map((entry) => entry.program.country))].sort(),
    [withWindows],
  ) as ('MY' | 'SG')[];
  const availableStatuses = useMemo(
    () =>
      [
        ...new Set(
          withWindows
            .map((entry) => entry.window?.status)
            .filter((status): status is WindowStatus => Boolean(status)),
        ),
      ],
    [withWindows],
  );

  const openNow = withWindows.filter((entry) => entry.window?.status === 'open').length;
  const openingSoon = withWindows.filter(
    (entry) => entry.window?.status === 'opening_soon',
  ).length;

  const closingSoon = useMemo(() => {
    if (!now) return [];
    return withWindows.flatMap((entry) => {
      if (entry.program.dataConfidence !== 'verified') return [];
      const info = closingSoonInfo(entry.program, now);
      if (!info) return [];
      return [{ program: entry.program, ...info }];
    });
  }, [withWindows, now]);

  // ---- Before the browser has read localStorage -----------------------------

  if (!ready) {
    return (
      <Shell>
        <div className="py-16" aria-busy="true">
          <p className="font-mono text-[0.8125rem] text-slate">Reading your saved profile…</p>
        </div>
      </Shell>
    );
  }

  // ---- Nothing saved --------------------------------------------------------

  if (!profile) {
    return (
      <Shell>
        <div
          data-testid={TESTID.shortlistNoProfile}
          className="max-w-[56ch] border border-ink bg-surface p-5 sm:p-6"
        >
          <h1 className="text-[1.5rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.75rem]">
            Nothing saved in this browser yet.
          </h1>
          <p className="mt-3 text-[1rem] leading-relaxed text-ink-80">
            The shortlist is built from your seven answers, and there are none here — either
            you have not filled the form, or this is a different browser to the one you used.
          </p>
          <p className="mt-6">
            <Link href="/" className="btn btn-primary">
              Fill in the seven questions
            </Link>
          </p>
          <p className="mt-4 text-[0.875rem] leading-snug text-slate">
            It takes about a minute, and you can still{' '}
            <Link href="/calendar/" className="text-link">
              look at the calendar
            </Link>{' '}
            without one.
          </p>
        </div>
      </Shell>
    );
  }

  // ---- Saved profile, nothing eligible -------------------------------------

  const nothingEligible = scored.eligible.length === 0;
  const filtersHideEverything = !nothingEligible && filtered.length === 0;

  return (
    <Shell>
      <header className="rule-heavy pb-3">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <div>
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[2.25rem]">
              {nothingEligible
                ? 'Nothing here matches your profile yet.'
                : `${scored.eligible.length} ${
                    scored.eligible.length === 1 ? 'programme is' : 'programmes are'
                  } open to you.`}
            </h1>
            <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-80">
              {profile.degreeField}, CGPA {profile.cgpa.toFixed(2)}, graduating{' '}
              {MONTH_LONG[profile.graduationMonth - 1]} {profile.graduationYear}.{' '}
              {now && !nothingEligible ? (
                <>
                  <span className="text-ink">
                    {openNow === 0
                      ? 'None of them are open this month'
                      : `${openNow} ${openNow === 1 ? 'is' : 'are'} open this month`}
                  </span>
                  {openingSoon > 0 ? `, and ${openingSoon} more open within two months.` : '.'}
                </>
              ) : null}
            </p>
          </div>

          <p className="font-mono text-[0.75rem] text-slate">
            <Link href="/" className="text-link">
              Change your answers
            </Link>
          </p>
        </div>
      </header>

      <ClosingSoonStrip items={closingSoon} />

      {nothingEligible ? (
        <EmptyState
          testId={TESTID.shortlistEmpty}
          title={
            includeSamples
              ? 'None of these programmes will take this profile.'
              : 'None of the checked programmes will take this profile.'
          }
          body="That is a real answer, not a bug. The three things that close programmes are CGPA, degree field and citizenship, and the list below shows exactly which one blocked each programme."
          actions={
            <>
              <Link href="/" className="btn btn-primary">
                Change your answers
              </Link>
              <Link href="/calendar/" className="btn btn-secondary">
                See the whole year anyway
              </Link>
            </>
          }
        />
      ) : (
        <>
          <div className="rule-bottom flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
            <span className="font-mono text-[0.75rem] text-slate sm:w-14">Order</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="chip-filter"
                aria-pressed={sort === 'fit'}
                onClick={() => setSort('fit')}
              >
                Best fit
              </button>
              <button
                type="button"
                className="chip-filter"
                aria-pressed={sort === 'soonest'}
                onClick={() => setSort('soonest')}
                disabled={!now}
              >
                Opens soonest
              </button>
            </div>
          </div>

          <FilterBar
            filters={filters}
            onChange={(next, kind, value, active) => {
              setFilters(next);
              trackFilterUsed(kind, value as never, active);
            }}
            availableSectors={availableSectors}
            availableCountries={availableCountries}
            availableStatuses={availableStatuses}
            resultCount={filtered.length}
            totalCount={withWindows.length}
            statusesKnown={Boolean(now)}
            includeSamples={includeSamples}
            sampleCount={SAMPLE_COUNT}
            onToggleSamples={(included) => {
              setSamplesIncluded(included);
              trackFilterUsed('samples', null, included);
            }}
          />

          {filtersHideEverything ? (
            <EmptyState
              testId={TESTID.shortlistEmpty}
              title="No programme matches all of those filters at once."
              body="Your profile still clears the eligibility bar for these programmes — the filters are what is hiding them. Drop a sector or a window status and they come back."
              actions={
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setFilters(NO_FILTERS);
                    trackFilterUsed('reset', null, false);
                  }}
                >
                  Clear all filters
                </button>
              }
            />
          ) : (
            <ol className="mt-1">
              {filtered.map((entry, index) => (
                <ShortlistRow
                  key={entry.program.id}
                  rank={index + 1}
                  program={entry.program}
                  fit={entry.fit}
                  now={now}
                  graduationMonth={profile.graduationMonth}
                />
              ))}
            </ol>
          )}
        </>
      )}

      <EmailCapture
        programmeIds={scored.eligible
          .filter((entry) => entry.program.dataConfidence === 'verified')
          .map((entry) => entry.program.id)}
      />

      <IneligibleSection entries={scored.ineligible} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-8 pt-8 sm:px-6 sm:pt-10">{children}</div>
  );
}

function EmptyState({
  testId,
  title,
  body,
  actions,
}: {
  testId: string;
  title: string;
  body: string;
  actions: React.ReactNode;
}) {
  return (
    <div data-testid={testId} className="mt-6 max-w-[62ch] border border-ink bg-surface p-5 sm:p-6">
      <h2 className="text-[1.25rem] font-semibold leading-snug tracking-[-0.02em] text-ink">
        {title}
      </h2>
      <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-80">{body}</p>
      <div className="mt-5 flex flex-wrap gap-3">{actions}</div>
    </div>
  );
}
