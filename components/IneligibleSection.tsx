'use client';

import Link from 'next/link';
import type { IneligibilityCode } from '@/types';
import type { ScoredProgram } from '@/lib/fit';
import { COUNTRY_LABEL, SECTOR_LABEL } from '@/data/taxonomy';
import { shortMonthRangeLabel } from '@/lib/windows';
import { trackProgramDetailOpened } from '@/lib/analytics';
import { TESTID } from '@/lib/testids';

const REASON_HEADING: Record<IneligibilityCode, string> = {
  cgpa: 'CGPA',
  field: 'Degree field',
  citizenship: 'Citizenship or visa',
};

/**
 * Ineligible programmes are listed, not hidden. Knowing you are two tenths of a
 * point short of one bank and simply the wrong degree for another tells a
 * student what to do next; an empty page does not.
 */
export function IneligibleSection({ entries }: { entries: ScoredProgram[] }) {
  if (entries.length === 0) return null;

  const byCode = new Map<IneligibilityCode, number>();
  entries.forEach((entry) => {
    entry.fit.reasons.forEach((reason) => {
      byCode.set(reason.code, (byCode.get(reason.code) ?? 0) + 1);
    });
  });

  const summary = (['cgpa', 'field', 'citizenship'] as IneligibilityCode[])
    .filter((code) => byCode.has(code))
    .map((code) => `${byCode.get(code)} on ${REASON_HEADING[code].toLowerCase()}`);

  return (
    <section aria-labelledby="ineligible-heading" className="mt-14">
      <div className="rule-heavy flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-2">
        <h2
          id="ineligible-heading"
          className="text-[1.25rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.5rem]"
        >
          Not eligible
          <span className="ml-2 font-mono text-[0.875rem] font-normal tabular text-slate">
            {entries.length}
          </span>
        </h2>
        {summary.length > 0 ? (
          <p className="font-mono text-[0.75rem] text-slate">{summary.join(' · ')}</p>
        ) : null}
      </div>

      <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed text-ink-80">
        These are here on purpose. A programme you miss by 0.06 of a CGPA point is worth
        knowing about; so is one that was never open to your degree, so you stop seeing it in
        every list.
      </p>

      <ul className="mt-5">
        {entries.map((entry) => (
          <li
            key={entry.program.id}
            data-testid={TESTID.ineligibleRow}
            data-program-id={entry.program.id}
            data-sector={entry.program.sector}
            data-country={entry.program.country}
            className="register-row grid grid-cols-1 gap-x-6 gap-y-2 px-1 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] sm:items-start"
          >
            <div className="min-w-0">
              <h2 className="text-[1rem] font-semibold leading-snug tracking-[-0.015em] text-ink">
                <Link
                  href={`/program/${entry.program.id}/`}
                  onClick={() =>
                    trackProgramDetailOpened(entry.program.id, entry.program.employer)
                  }
                  className="text-link decoration-rule hover:decoration-ink"
                >
                  {entry.program.employer}
                </Link>
              </h2>
              <p className="mt-0.5 text-[0.9375rem] leading-snug text-slate">
                {entry.program.name}
              </p>
              <p className="mt-1.5 font-mono text-[0.75rem] text-slate">
                {SECTOR_LABEL[entry.program.sector]} · {COUNTRY_LABEL[entry.program.country]} ·{' '}
                {shortMonthRangeLabel(entry.program.opensMonth, entry.program.closesMonth)}
              </p>
            </div>

            <ul className="flex flex-col gap-1.5">
              {entry.fit.reasons.map((reason) => (
                <li
                  key={reason.code}
                  data-testid={TESTID.ineligibleReason}
                  data-reason={reason.code}
                  className="flex items-start gap-2 border-l-2 border-oxblood pl-2.5 text-[0.875rem] leading-snug text-ink-80"
                >
                  <span className="sr-only-focusable">{REASON_HEADING[reason.code]}: </span>
                  {reason.sentence}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}
