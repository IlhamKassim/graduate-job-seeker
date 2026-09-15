'use client';

import Link from 'next/link';
import { PROGRAMS } from '@/data/programs';
import { COUNTRY_LABEL, MONTH_LONG, SECTOR_LABEL } from '@/data/taxonomy';
import { trackCalendarViewed, trackProgramDetailOpened } from '@/lib/analytics';
import { useNow, useOnceAfterMount, useProfile } from '@/lib/hooks';
import { resolveWindow, shortMonthRangeLabel, windowWraps } from '@/lib/windows';
import { MonthAxis, WindowStrip, monthCentre, nowPosition } from '@/components/WindowStrip';
import { StatusChip } from '@/components/StatusChip';
import { TESTID } from '@/lib/testids';
import type { Program, WindowStatus } from '@/types';

/**
 * The page that makes the timing problem visible: every sample window on the
 * same twelve-month ruler, with the student's graduation month drawn through it.
 */
export function CalendarView() {
  const { profile, ready } = useProfile();
  const now = useNow();

  useOnceAfterMount(() => trackCalendarViewed(PROGRAMS.length), [PROGRAMS.length]);

  const rows = [...PROGRAMS].sort(
    (a, b) =>
      a.opensMonth - b.opensMonth ||
      a.employer.localeCompare(b.employer) ||
      a.name.localeCompare(b.name),
  );

  const graduationMonth = profile?.graduationMonth ?? null;
  const openCount = now
    ? rows.filter((program) => resolveWindow(program, now).status === 'open').length
    : 0;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-8 pt-8 sm:px-6 sm:pt-10">
      <header className="rule-heavy pb-3">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[2.25rem]">
          The year, laid out.
        </h1>
        <p className="mt-2 max-w-[64ch] text-[0.9375rem] leading-relaxed text-ink-80">
          Every sample programme on the same twelve months. Open windows are the
          highlighter. Opening-soon windows are hatched. Closed windows sit as a
          thinner grey bar. The dashed line is when you finish your degree.
        </p>
        {ready && profile ? (
          <p className="mt-2 font-mono text-[0.75rem] leading-relaxed text-ink">
            You graduate in {MONTH_LONG[profile.graduationMonth - 1]} {profile.graduationYear}
            {now ? (
              <>
                {' '}
                · {openCount} {openCount === 1 ? 'window is' : 'windows are'} open this month.
              </>
            ) : null}
          </p>
        ) : ready ? (
          <p className="mt-2 font-mono text-[0.75rem] leading-relaxed text-slate">
            No profile saved, so there is no graduation line.{' '}
            <Link href="/" className="text-link">
              Answer the seven questions
            </Link>{' '}
            and it appears.
          </p>
        ) : (
          <p className="mt-2 font-mono text-[0.75rem] text-slate">Reading your saved profile…</p>
        )}
      </header>

      <Legend now={now} />

      {rows.length === 0 ? (
        <p data-testid={TESTID.calendarEmpty} className="mt-8 max-w-[54ch] text-[0.9375rem] text-ink-80">
          There are no programmes in this build to plot.
        </p>
      ) : (
        <div className="mt-4">
          <div className="min-w-0">
            <MonthAxis now={now} graduationMonth={graduationMonth} />
          </div>

          <div className="relative border-x border-b border-rule">
            {now ? (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 z-10 w-px bg-ink-80"
                style={{ left: `${nowPosition(now)}%` }}
              />
            ) : null}

            {graduationMonth ? (
              <div
                data-testid={TESTID.graduationMarker}
                title={`Graduation: ${MONTH_LONG[graduationMonth - 1]}`}
                aria-label={`Graduation month ${MONTH_LONG[graduationMonth - 1]}, marked on the year`}
                className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-ink"
                style={{ left: `${monthCentre(graduationMonth)}%`, marginLeft: '-1px' }}
              />
            ) : null}

            <ol>
              {rows.map((program) => (
                <CalendarRow key={program.id} program={program} now={now} />
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarRow({ program, now }: { program: Program; now: Date | null }) {
  const window = now ? resolveWindow(program, now) : null;
  const wraps = windowWraps(program.opensMonth, program.closesMonth);
  const status: WindowStatus | null = window?.status ?? null;

  return (
    <li
      data-testid={TESTID.calendarRow}
      data-program-id={program.id}
      data-opens-month={program.opensMonth}
      data-closes-month={program.closesMonth}
      data-wraps={wraps ? 'true' : 'false'}
      data-sector={program.sector}
      className="register-row grid grid-cols-1 gap-2 px-2 py-3 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_7rem] sm:items-center sm:gap-4 sm:px-3"
    >
      <div className="min-w-0 pr-6 sm:pr-0">
        <h2 className="text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] text-ink">
          <Link
            href={`/program/${program.id}/`}
            onClick={() => trackProgramDetailOpened(program.id, program.employer)}
            className="text-link"
          >
            {program.employer}
          </Link>
        </h2>
        <p className="mt-0.5 text-[0.8125rem] leading-snug text-slate">{program.name}</p>
        <p className="mt-1 font-mono text-[0.75rem] leading-snug text-slate">
          {SECTOR_LABEL[program.sector]} · {COUNTRY_LABEL[program.country]} ·{' '}
          {program.cities.join(', ')}
        </p>
      </div>

      <div className="min-w-0">
        <WindowStrip
          opensMonth={program.opensMonth}
          closesMonth={program.closesMonth}
          status={status}
          scale="small"
          testable
        />
        <p className="mt-1 font-mono text-[0.75rem] tabular text-ink">
          {shortMonthRangeLabel(program.opensMonth, program.closesMonth)}
          {wraps ? ' · runs across new year' : ''}
        </p>
      </div>

      <div className="sm:justify-self-end">
        <StatusChip status={status} />
      </div>
    </li>
  );
}

function Legend({ now }: { now: Date | null }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[0.75rem] text-ink-80">
      <li className="flex min-h-6 items-center gap-2">
        <span aria-hidden className="h-2.5 w-6 border border-ink bg-signal" />
        Open now
      </li>
      <li className="flex min-h-6 items-center gap-2">
        <span
          aria-hidden
          className="h-2.5 w-6 border border-ink"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent 0, transparent 3px, rgba(17, 20, 24, 0.22) 3px, rgba(17, 20, 24, 0.22) 4px)',
          }}
        />
        Opening soon
      </li>
      <li className="flex min-h-6 items-center gap-2">
        <span aria-hidden className="h-1.5 w-6 bg-rule" />
        Closed
      </li>
      {now ? (
        <li className="flex min-h-6 items-center gap-2">
          <span aria-hidden className="h-3 w-px bg-ink-80" />
          Today
        </li>
      ) : null}
      <li className="flex min-h-6 items-center gap-2">
        <span aria-hidden className="h-3 w-px border-l border-dashed border-ink" />
        Graduation
      </li>
    </ul>
  );
}
