'use client';

import { catalog } from '@/lib/catalog';
import { MONTH_SHORT } from '@/data/taxonomy';
import { resolveWindow } from '@/lib/windows';
import { useNow } from '@/lib/hooks';
import { nowPosition, windowSegments } from '@/components/WindowStrip';

/**
 * The argument for the whole app, made in one picture: every window in the seed
 * set stacked against the same twelve months. The shape of the year is obvious
 * here and invisible when the same information is spread across thirty tabs.
 */
export function YearPreview() {
  const now = useNow();

  const programs = catalog(false);
  const rows = programs.map((program) => ({
    id: program.id,
    segments: windowSegments(program.opensMonth, program.closesMonth),
    status: now ? resolveWindow(program, now).status : null,
    opensMonth: program.opensMonth,
  })).sort((a, b) => a.opensMonth - b.opensMonth);

  const openCount = rows.filter((row) => row.status === 'open').length;

  return (
    <figure className="m-0">
      <div className="border border-ink bg-surface">
        <div className="flex border-b border-rule">
          {MONTH_SHORT.map((month, index) => (
            <div
              key={month}
              className={`flex-1 border-r border-rule-soft py-1 text-center font-mono text-[0.75rem] leading-none last:border-r-0 ${
                now && now.getMonth() === index ? 'bg-ink text-paper' : 'text-slate'
              }`}
            >
              <span className="hidden xs:inline">{month}</span>
              <span className="xs:hidden">{month.slice(0, 1)}</span>
            </div>
          ))}
        </div>

        <div className="relative px-0 py-1.5">
          {rows.map((row) => (
            <div key={row.id} className="relative h-[3px] w-full">
              {row.segments.map((segment, index) => (
                <span
                  key={index}
                  className={`absolute inset-y-0 ${
                    row.status === 'open'
                      ? 'bg-signal outline outline-1 outline-ink'
                      : row.status === 'opening_soon'
                        ? 'bg-ink-80'
                        : 'bg-rule'
                  }`}
                  style={{ left: `${segment.left}%`, width: `${segment.width}%` }}
                />
              ))}
            </div>
          ))}

          {now ? (
            <span
              aria-hidden
              className="absolute inset-y-0 w-px bg-ink"
              style={{ left: `${nowPosition(now)}%` }}
            />
          ) : null}
        </div>
      </div>

      <figcaption className="mt-2 font-mono text-[0.75rem] leading-relaxed text-slate">
        {programs.length} checked programmes, one row each, laid over the same twelve months.
        {now ? (
          <>
            {' '}
            The vertical line is today.{' '}
            <span className="text-ink">
              {openCount} {openCount === 1 ? 'window is' : 'windows are'} open right now.
            </span>
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}
