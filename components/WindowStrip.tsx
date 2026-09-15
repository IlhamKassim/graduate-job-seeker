'use client';

import type { WindowStatus } from '@/types';
import { MONTH_LONG, MONTH_SHORT } from '@/data/taxonomy';
import { TESTID } from '@/lib/testids';

/**
 * The one motif this app repeats. A twelve-cell track with the application
 * window drawn on it, at three sizes: a hairline in a shortlist row, a small one
 * on a programme header, and the full-width one that builds the calendar.
 *
 * A window that runs across new year draws as two segments rather than one bar
 * wrapping invisibly, because a student reading it needs to see both halves.
 */

export type StripScale = 'micro' | 'small' | 'full';

const HEIGHT: Record<StripScale, string> = {
  micro: 'h-2.5',
  small: 'h-4',
  full: 'h-6',
};

interface Segment {
  left: number;
  width: number;
  /** True for the second half of a window that runs across new year. */
  continued: boolean;
}

/** Turn a month range into one or two positioned segments, as percentages. */
export function windowSegments(opensMonth: number, closesMonth: number): Segment[] {
  if (opensMonth <= closesMonth) {
    return [
      {
        left: ((opensMonth - 1) / 12) * 100,
        width: ((closesMonth - opensMonth + 1) / 12) * 100,
        continued: false,
      },
    ];
  }
  return [
    {
      left: ((opensMonth - 1) / 12) * 100,
      width: ((12 - opensMonth + 1) / 12) * 100,
      continued: false,
    },
    { left: 0, width: (closesMonth / 12) * 100, continued: true },
  ];
}

/** Where "now" sits on the track, including how far through the month it is. */
export function nowPosition(now: Date): number {
  const month = now.getMonth();
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), month + 1, 0).getDate();
  return ((month + (day - 1) / daysInMonth) / 12) * 100;
}

/** The centre of a month, used for the graduation marker. */
export function monthCentre(month: number): number {
  return ((month - 0.5) / 12) * 100;
}

interface WindowStripProps {
  opensMonth: number;
  closesMonth: number;
  status: WindowStatus | null;
  scale?: StripScale;
  now?: Date | null;
  graduationMonth?: number | null;
  /** Adds the per-bar test hook the calendar rows are checked against. */
  testable?: boolean;
  className?: string;
}

export function WindowStrip({
  opensMonth,
  closesMonth,
  status,
  scale = 'micro',
  now = null,
  graduationMonth = null,
  testable = false,
  className = '',
}: WindowStripProps) {
  const segments = windowSegments(opensMonth, closesMonth);
  // Until the client knows today's date, draw the window as a plain range
  // rather than guessing at a status the build could not know.
  const resolved: WindowStatus | 'unknown' = status ?? 'unknown';

  const range =
    opensMonth === closesMonth
      ? MONTH_LONG[opensMonth - 1]
      : `${MONTH_LONG[opensMonth - 1]} to ${MONTH_LONG[closesMonth - 1]}`;

  const statusWord =
    resolved === 'open'
      ? 'open now'
      : resolved === 'opening_soon'
        ? 'opening soon'
        : resolved === 'closed'
          ? 'closed for now'
          : 'status loading';

  return (
    <div
      role="img"
      aria-label={`Application window ${range}, ${statusWord}`}
      className={`strip-track ${HEIGHT[scale]} w-full ${className}`}
    >
      <span className="strip-grid" aria-hidden />

      {segments.map((segment, index) => (
        <span
          key={index}
          aria-hidden
          data-testid={testable ? TESTID.windowBar : undefined}
          data-status={resolved}
          data-continued={segment.continued ? 'true' : 'false'}
          data-wraps={segment.continued ? 'true' : 'false'}
          className={`strip-bar ${
            resolved === 'unknown' ? 'strip-bar--closed' : `strip-bar--${resolved}`
          }`}
          style={{ left: `${segment.left}%`, width: `${segment.width}%` }}
        />
      ))}

      {now ? (
        <span
          aria-hidden
          className="strip-now"
          data-testid="strip-now"
          style={{ left: `${nowPosition(now)}%` }}
        />
      ) : null}

      {graduationMonth ? (
        <span
          aria-hidden
          className="strip-graduation"
          style={{ left: `${monthCentre(graduationMonth)}%`, top: '-2px', bottom: '-2px' }}
        />
      ) : null}
    </div>
  );
}

/** The month ruler. Rendered once above a stack of strips, never per row. */
export function MonthAxis({
  now = null,
  graduationMonth = null,
  compact = false,
}: {
  now?: Date | null;
  graduationMonth?: number | null;
  compact?: boolean;
}) {
  return (
    <div
      data-testid={TESTID.calendarAxis}
      className="relative flex w-full border-x border-t border-rule bg-surface"
    >
      {MONTH_SHORT.map((month, index) => {
        const isGraduation = graduationMonth === index + 1;
        const isNow = now ? now.getMonth() === index : false;
        return (
          <div
            key={month}
            data-testid={TESTID.axisMonth}
            data-month={index + 1}
            className={`flex-1 border-r border-rule-soft py-1 text-center font-mono text-[0.75rem] leading-tight last:border-r-0 ${
              isNow ? 'bg-ink text-paper' : isGraduation ? 'text-ink' : 'text-slate'
            }`}
          >
            {compact ? month.slice(0, 1) : month}
          </div>
        );
      })}
    </div>
  );
}
