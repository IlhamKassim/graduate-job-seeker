'use client';

import Link from 'next/link';
import type { Program } from '@/types';
import { MONTH_LONG } from '@/data/taxonomy';
import { scoreProgram } from '@/lib/fit';
import { resolveWindow } from '@/lib/windows';
import { useNow, useProfile } from '@/lib/hooks';
import { FitScore } from '@/components/FitScore';
import { StatusChip } from '@/components/StatusChip';
import { ConfidenceChip } from '@/components/ConfidenceChip';
import { WindowStrip } from '@/components/WindowStrip';
import { TESTID } from '@/lib/testids';

/**
 * Everything on this page that depends on the person reading it: the live window
 * status, the eligibility verdict, and the fit breakdown. Split out from the
 * static half so the programme's own facts render immediately either way.
 */
export function ProgramEligibility({ program }: { program: Program }) {
  const { profile, ready } = useProfile();
  const now = useNow();
  const window = now ? resolveWindow(program, now) : null;

  const fit = profile ? scoreProgram(program, profile) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <WindowStrip
          opensMonth={program.opensMonth}
          closesMonth={program.closesMonth}
          status={window?.status ?? null}
          now={now}
          graduationMonth={profile?.graduationMonth ?? null}
          scale="small"
        />
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <StatusChip status={window?.status ?? null} />
          <ConfidenceChip confidence={program.dataConfidence} />
          <span className="font-mono text-[0.75rem] tabular text-ink">
            {program.applicationCycle === 'rolling'
              ? 'Year-round'
              : `${MONTH_LONG[program.opensMonth - 1]} – ${MONTH_LONG[program.closesMonth - 1]}`}
          </span>
          {program.applicationCycle !== 'rolling' && program.opensMonth > program.closesMonth ? (
            <span className="font-mono text-[0.75rem] text-slate">runs across new year</span>
          ) : null}
        </div>
        {window ? (
          <p className="mt-1.5 text-[0.9375rem] leading-snug text-ink-80">{window.label}</p>
        ) : null}
        {profile ? (
          <p className="mt-1.5 text-[0.875rem] leading-snug text-slate">
            You graduate in {MONTH_LONG[profile.graduationMonth - 1]} {profile.graduationYear}
            {'. '}
            {graduationNote(program.opensMonth, program.closesMonth, profile.graduationMonth)}
          </p>
        ) : null}
      </div>

      <div data-testid={TESTID.eligibilityCheck} className="border border-ink bg-surface p-4">
        {!ready ? (
          <p className="font-mono text-[0.8125rem] text-slate" aria-busy="true">
            Checking against your saved profile…
          </p>
        ) : !profile ? (
          <div data-testid={TESTID.noProfileNotice}>
            <h2 className="text-[1rem] font-semibold tracking-[-0.015em] text-ink">
              We cannot check this one against you yet.
            </h2>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-80">
              Everything above is the programme&rsquo;s own information. Whether you clear its
              CGPA, degree and citizenship rules needs your seven answers.
            </p>
            <p className="mt-4">
              <Link href="/" className="btn btn-primary">
                Fill in the seven questions
              </Link>
            </p>
          </div>
        ) : fit && fit.eligible ? (
          <div>
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-[1rem] font-semibold tracking-[-0.015em] text-ink">
                  <span aria-hidden className="h-2.5 w-2.5 bg-signal outline outline-1 outline-ink" />
                  You are eligible. You clear every rule this programme states.
                </h2>
                <p className="mt-1.5 max-w-[52ch] text-[0.9375rem] leading-relaxed text-ink-80">
                  Your CGPA, degree field and citizenship all pass. That is the eligibility
                  bar, not a reading of whether the employer will take you.
                </p>
              </div>
              <div className="w-full sm:w-auto">
                <FitScore fit={fit} align="left" />
              </div>
            </div>
          </div>
        ) : fit ? (
          <div>
            <h2 className="text-[1rem] font-semibold tracking-[-0.015em] text-ink">
              {fit.reasons.length === 1
                ? 'One rule rules you out of this one.'
                : `${fit.reasons.length} rules rule you out of this one.`}
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {fit.reasons.map((reason) => (
                <li
                  key={reason.code}
                  data-testid={TESTID.ineligibleReason}
                  data-reason={reason.code}
                  className="border-l-2 border-oxblood pl-2.5 text-[0.9375rem] leading-snug text-ink-80"
                >
                  {reason.sentence}
                </li>
              ))}
            </ul>
            <p className="mt-3 max-w-[54ch] text-[0.875rem] leading-relaxed text-slate">
              The stages below are still worth reading. Most employers in this sector run a
              similar process, so it tells you what to expect from the ones you do clear.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Whether the window lands before or after the student finishes their degree. */
function graduationNote(opensMonth: number, closesMonth: number, graduationMonth: number): string {
  const months: number[] = [];
  let month = opensMonth;
  for (let step = 0; step < 12; step += 1) {
    months.push(month);
    if (month === closesMonth) break;
    month = month === 12 ? 1 : month + 1;
  }

  if (months.includes(graduationMonth)) {
    return 'This window is open across the month you finish.';
  }
  const beforeGraduation = (graduationMonth - closesMonth + 12) % 12;
  if (beforeGraduation <= 6) {
    return `This window shuts about ${beforeGraduation} ${
      beforeGraduation === 1 ? 'month' : 'months'
    } before you finish, so you would be applying with your degree still in progress.`;
  }
  return 'This window opens after you finish, so you would be applying as a graduate.';
}
