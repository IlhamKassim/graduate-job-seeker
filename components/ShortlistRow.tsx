'use client';

import Link from 'next/link';
import type { FitResult, Program } from '@/types';
import { COUNTRY_LABEL, SECTOR_LABEL } from '@/data/taxonomy';
import { resolveWindow, shortMonthRangeLabel } from '@/lib/windows';
import { trackProgramDetailOpened } from '@/lib/analytics';
import { FitScore } from '@/components/FitScore';
import { StatusChip } from '@/components/StatusChip';
import { ConfidenceChip } from '@/components/ConfidenceChip';
import { WindowStrip } from '@/components/WindowStrip';
import { TESTID } from '@/lib/testids';

/**
 * A row in a register, not a card. Rank sits in a fixed gutter so the numbers
 * line up down the page, and the window strip puts every programme on the same
 * twelve-month ruler at a glance.
 */
export function ShortlistRow({
  rank,
  program,
  fit,
  now,
  graduationMonth,
}: {
  rank: number;
  program: Program;
  fit: FitResult;
  now: Date | null;
  graduationMonth: number | null;
}) {
  const window = now ? resolveWindow(program, now) : null;

  return (
    <li
      data-testid={TESTID.shortlistRow}
      data-program-id={program.id}
      data-sector={program.sector}
      data-country={program.country}
      data-status={window?.status ?? 'unknown'}
      data-fit={fit.total}
      className="register-row grid grid-cols-1 gap-x-6 gap-y-3 px-1 py-4 sm:grid-cols-[2.25rem_minmax(0,1fr)_13rem_11rem] sm:items-start sm:py-5"
    >
      <div className="flex items-baseline justify-between gap-3 sm:block">
        <span className="font-mono text-[0.8125rem] tabular text-slate">
          {String(rank).padStart(2, '0')}
        </span>
        <span className="sm:hidden">
          <StatusChip status={window?.status ?? null} />
        </span>
      </div>

      <div className="min-w-0">
        <h2 className="text-[1.0625rem] font-semibold leading-snug tracking-[-0.015em] text-ink">
          <Link
            href={`/program/${program.id}/`}
            onClick={() => trackProgramDetailOpened(program.id, program.employer)}
            className="text-link decoration-rule hover:decoration-ink"
          >
            {program.employer}
          </Link>
        </h2>
        <p className="mt-0.5 text-[0.9375rem] leading-snug text-ink-80">{program.name}</p>
        <p className="mt-1.5 font-mono text-[0.75rem] leading-relaxed text-slate">
          {SECTOR_LABEL[program.sector]} · {program.cities.join(', ')} ·{' '}
          {COUNTRY_LABEL[program.country]} · {program.typicalProcessWeeks} wk process ·{' '}
          {program.stages.length} {program.stages.length === 1 ? 'stage' : 'stages'}
        </p>
      </div>

      <div className="min-w-0">
        <WindowStrip
          opensMonth={program.opensMonth}
          closesMonth={program.closesMonth}
          status={window?.status ?? null}
          now={now}
          graduationMonth={graduationMonth}
          scale="micro"
        />
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-[0.75rem] tabular text-ink">
            {program.applicationCycle === 'rolling'
              ? 'Year-round'
              : shortMonthRangeLabel(program.opensMonth, program.closesMonth)}
          </span>
          <ConfidenceChip confidence={program.dataConfidence} />
          <span className="hidden sm:inline">
            <StatusChip status={window?.status ?? null} />
          </span>
        </div>
        {window ? (
          <p className="mt-1 text-[0.8125rem] leading-snug text-slate">{window.label}</p>
        ) : null}
      </div>

      <div className="sm:justify-self-end">
        <FitScore fit={fit} />
      </div>
    </li>
  );
}
