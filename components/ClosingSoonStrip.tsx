import Link from 'next/link';
import type { Program } from '@/types';
import type { ClosingSoonInfo } from '@/lib/windows';
import { TESTID } from '@/lib/testids';

export function ClosingSoonStrip({
  items,
}: {
  items: Array<{ program: Program } & ClosingSoonInfo>;
}) {
  if (items.length === 0) return null;

  return (
    <section
      data-testid={TESTID.closingSoon}
      aria-labelledby="closing-soon-heading"
      className="mt-5 border border-ink bg-surface p-4 sm:p-5"
    >
      <h2
        id="closing-soon-heading"
        className="text-[1.125rem] font-semibold tracking-[-0.02em] text-ink"
      >
        Closing soon
      </h2>
      <p className="mt-2 max-w-[62ch] text-[0.9375rem] leading-relaxed text-ink-80">
        These windows close within two weeks, or this is their last published month. We do not
        have a time of day — open the employer page before you act.
      </p>
      <ul className="mt-3">
        {items.map((item) => (
          <li
            key={item.program.id}
            data-testid={TESTID.closingSoonItem}
            className="register-row flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
          >
            <p className="min-w-0 text-[0.9375rem] leading-snug text-ink">
              <Link
                href={`/program/${item.program.id}/`}
                className="text-link decoration-rule hover:decoration-ink"
              >
                {item.program.employer}
              </Link>
              <span className="text-ink-80"> — {item.program.name}</span>
            </p>
            <p className="font-mono text-[0.75rem] text-slate">
              {labelFor(item.daysLeft, item.lastMonth)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function labelFor(daysLeft: number | null, lastMonth: boolean): string {
  if (daysLeft === 0) return 'Closes today';
  if (daysLeft === 1) return '1 day left';
  if (daysLeft != null) return `${daysLeft} days left`;
  if (lastMonth) return 'Last published month';
  return 'Closing soon';
}
