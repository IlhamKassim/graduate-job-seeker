import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PROGRAMS } from '@/data/programs';
import { COUNTRY_LABEL, SECTOR_LABEL } from '@/data/taxonomy';
import { preparationFor, processShape, STAGE_LABEL } from '@/lib/prepare';
import { monthRangeLabel } from '@/lib/windows';
import { formatCgpa } from '@/lib/fit';
import { StageTimeline } from '@/components/StageTimeline';
import { ProgramEligibility } from '@/components/ProgramEligibility';
import { ProgramViewTracker } from '@/components/ProgramViewTracker';
import { TESTID } from '@/lib/testids';

export function generateStaticParams() {
  return PROGRAMS.map((program) => ({ id: program.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const program = PROGRAMS.find((entry) => entry.id === id);
  if (!program) return { title: 'Programme not found' };
  return {
    title: `${program.employer} — ${program.name}`,
    description: `What the ${program.employer} ${program.name} puts applicants through, and when its window opens. Sample data for a pilot.`,
  };
}

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = PROGRAMS.find((entry) => entry.id === id);
  if (!program) notFound();

  const prepare = preparationFor(program);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-8 pt-6 sm:px-6 sm:pt-8">
      <ProgramViewTracker programId={program.id} employer={program.employer} />

      <p className="font-mono text-[0.75rem] text-slate">
        <Link href="/shortlist/" className="text-link">
          ← Back to your shortlist
        </Link>
      </p>

      <header className="rule-heavy mt-4 pb-4">
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[2.25rem]">
          {program.employer}
        </h1>
        <p className="mt-1 text-[1.0625rem] leading-snug text-ink-80">{program.name}</p>
        <p className="mt-2.5 font-mono text-[0.75rem] leading-relaxed text-slate">
          {SECTOR_LABEL[program.sector]} · {program.cities.join(', ')} ·{' '}
          {COUNTRY_LABEL[program.country]} · window {monthRangeLabel(program.opensMonth, program.closesMonth)}
        </p>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 lg:order-2">
          <ProgramEligibility program={program} />
        </div>

        <div className="min-w-0 lg:order-1">
          <section aria-labelledby="stages-heading">
            <div className="rule-heavy flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-2">
              <h2
                id="stages-heading"
                className="text-[1.25rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.5rem]"
              >
                What you are in for
              </h2>
              <p className="font-mono text-[0.75rem] tabular text-slate">
                {program.stages.length} stages · ~{program.typicalProcessWeeks} weeks
              </p>
            </div>

            <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed text-ink-80">
              {processShape(program)}
            </p>

            <div className="mt-7">
              <StageTimeline program={program} />
            </div>
          </section>

          <section aria-labelledby="prepare-heading" className="mt-12">
            <div className="rule-heavy pb-2">
              <h2
                id="prepare-heading"
                className="text-[1.25rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.5rem]"
              >
                What to prepare
              </h2>
            </div>
            <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed text-ink-80">
              Worked out from the stage types above, not from anything this employer has
              published. Treat it as the shape of the process rather than a checklist from
              them.
            </p>

            <ul data-testid={TESTID.prepareList} className="mt-5">
              {prepare.map((item) => (
                <li
                  key={item.id}
                  data-testid={TESTID.prepareItem}
                  className="register-row grid grid-cols-[minmax(0,1fr)] gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_9rem] sm:gap-4"
                >
                  <p className="text-[0.9375rem] leading-relaxed text-ink">{item.text}</p>
                  <p className="font-mono text-[0.75rem] leading-relaxed text-slate sm:text-right">
                    {STAGE_LABEL[item.from]}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="source-heading" className="mt-12">
            <div className="rule-heavy pb-2">
              <h2
                id="source-heading"
                className="text-[1.25rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.5rem]"
              >
                Check it yourself
              </h2>
            </div>
            <p className="mt-3 max-w-[62ch] text-[0.9375rem] leading-relaxed text-ink-80">
              Everything on this page except the employer name and the link below is sample
              data. The window months, the {formatCgpa(program.minCGPA ?? 0) !== '0.00' ? 'CGPA minimum, ' : ''}
              stage list and the timings are placeholders for testing this pilot.
            </p>
            <p className="mt-4">
              <a
                href={program.sourceUrl}
                data-testid={TESTID.sourceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                {program.employer} careers page
                <span aria-hidden>↗</span>
                <span className="sr-only-focusable">(opens in a new tab)</span>
              </a>
            </p>
            <p className="mt-3 font-mono text-[0.75rem] break-all text-slate">
              {program.sourceUrl}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
