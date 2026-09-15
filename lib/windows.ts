import type { Program, WindowStatus } from '@/types';
import { MONTH_LONG, MONTH_SHORT } from '@/data/taxonomy';
import { calendarDayDiff, parseIsoDate } from '@/lib/iso-date';

/**
 * Application windows are stored as a month range with no year for seasonal
 * programmes, because that is all most employers publish as a repeating cycle.
 * Rolling programmes accept applications year-round; their bar covers all
 * twelve months and the copy says so instead of inventing a close date.
 */

export interface WindowInfo {
  status: WindowStatus;
  /** Every month the window covers, in order, wrapping the year if needed. */
  months: number[];
  /** True when the window runs across the year boundary, e.g. November to February. */
  wraps: boolean;
  /** 0 when open, otherwise whole months until the window next opens. */
  monthsUntilOpen: number;
  /** Whole months the window still has left, counting the current month. 0 when closed. */
  monthsLeftOpen: number;
  /** Whole months since the window last closed, or null when it has not closed within a year. */
  monthsSinceClose: number | null;
  /** Two or three words for a chip. */
  shortLabel: string;
  /** One plain sentence for a row or a page header. */
  label: string;
  /** The factual month range, safe to render before the client knows today's date. */
  rangeLabel: string;
}

/** Months a window covers, in order, wrapping past December when it needs to. */
export function windowMonths(opensMonth: number, closesMonth: number): number[] {
  const months: number[] = [];
  let month = opensMonth;
  for (let step = 0; step < 12; step += 1) {
    months.push(month);
    if (month === closesMonth) break;
    month = month === 12 ? 1 : month + 1;
  }
  return months;
}

export function windowWraps(opensMonth: number, closesMonth: number): boolean {
  return opensMonth > closesMonth;
}

/** Whole months from `from` forward to `to` on a repeating 12-month cycle. */
function monthsForward(from: number, to: number): number {
  return (to - from + 12) % 12;
}

export function monthRangeLabel(opensMonth: number, closesMonth: number): string {
  if (opensMonth === closesMonth) return MONTH_LONG[opensMonth - 1];
  return `${MONTH_LONG[opensMonth - 1]} to ${MONTH_LONG[closesMonth - 1]}`;
}

export function shortMonthRangeLabel(opensMonth: number, closesMonth: number): string {
  if (opensMonth === closesMonth) return MONTH_SHORT[opensMonth - 1];
  return `${MONTH_SHORT[opensMonth - 1]}–${MONTH_SHORT[closesMonth - 1]}`;
}

/**
 * Resolve a window against a reference date. Pure, so the caller decides what
 * "today" means and tests can pin it.
 */
export function resolveWindow(
  program: Pick<Program, 'opensMonth' | 'closesMonth' | 'applicationCycle'>,
  now: Date,
): WindowInfo {
  if (program.applicationCycle === 'rolling') {
    const months = windowMonths(1, 12);
    return {
      status: 'open',
      months,
      wraps: false,
      monthsUntilOpen: 0,
      monthsLeftOpen: 12,
      monthsSinceClose: null,
      shortLabel: 'Open',
      label:
        'Applications are accepted year-round. Check the employer page for the next intake cut-off.',
      rangeLabel: 'Year-round',
    };
  }

  const { opensMonth, closesMonth } = program;
  const currentMonth = now.getMonth() + 1;
  const months = windowMonths(opensMonth, closesMonth);
  const wraps = windowWraps(opensMonth, closesMonth);
  const rangeLabel = monthRangeLabel(opensMonth, closesMonth);

  const openNow = months.includes(currentMonth);
  const monthsUntilOpen = openNow ? 0 : monthsForward(currentMonth, opensMonth);
  const monthsLeftOpen = openNow ? months.length - months.indexOf(currentMonth) : 0;
  const sinceClose = monthsForward(closesMonth, currentMonth);
  const monthsSinceClose = openNow ? null : sinceClose;

  let status: WindowStatus;
  if (openNow) status = 'open';
  else if (monthsUntilOpen <= 2) status = 'opening_soon';
  else status = 'closed';

  return {
    status,
    months,
    wraps,
    monthsUntilOpen,
    monthsLeftOpen,
    monthsSinceClose,
    shortLabel: shortLabelFor(status),
    label: sentenceFor(status, {
      opensMonth,
      closesMonth,
      monthsUntilOpen,
      monthsLeftOpen,
      monthsSinceClose,
    }),
    rangeLabel,
  };
}

function shortLabelFor(status: WindowStatus): string {
  if (status === 'open') return 'Open';
  if (status === 'opening_soon') return 'Opening soon';
  return 'Closed';
}

function sentenceFor(
  status: WindowStatus,
  parts: {
    opensMonth: number;
    closesMonth: number;
    monthsUntilOpen: number;
    monthsLeftOpen: number;
    monthsSinceClose: number | null;
  },
): string {
  const opens = MONTH_LONG[parts.opensMonth - 1];
  const closes = MONTH_LONG[parts.closesMonth - 1];

  if (status === 'open') {
    if (parts.monthsLeftOpen <= 1) return `Open now, and ${closes} is the last month.`;
    return `Open now, usually through ${closes}.`;
  }

  if (status === 'opening_soon') {
    if (parts.monthsUntilOpen === 1) return `Opens next month, around ${opens}.`;
    return `Opens in about two months, around ${opens}.`;
  }

  if (parts.monthsSinceClose === 1) {
    return `Closed last month. Usually opens again in ${opens}.`;
  }
  if (parts.monthsUntilOpen === 1) {
    return `Closed. Usually opens again next month, in ${opens}.`;
  }
  return `Closed. Usually opens again in ${opens}, about ${parts.monthsUntilOpen} months away.`;
}

export const WINDOW_STATUS_ORDER: WindowStatus[] = ['open', 'opening_soon', 'closed'];

export const WINDOW_STATUS_LABEL: Record<WindowStatus, string> = {
  open: 'Open',
  opening_soon: 'Opening soon',
  closed: 'Closed',
};

export const CLOSING_SOON_DAYS = 14;

export interface ClosingSoonInfo {
  daysLeft: number | null;
  lastMonth: boolean;
}

/**
 * True when a seasonal window has a published close date within `withinDays`,
 * or (when there is no calendar date) when this is the last published month.
 * Rolling programmes never qualify — they have no close to warn about.
 */
export function isClosingSoon(
  program: Pick<Program, 'applicationCycle' | 'closesOn' | 'opensMonth' | 'closesMonth'>,
  now: Date,
  withinDays = CLOSING_SOON_DAYS,
): boolean {
  return closingSoonInfo(program, now, withinDays) !== null;
}

export function closingSoonInfo(
  program: Pick<Program, 'applicationCycle' | 'closesOn' | 'opensMonth' | 'closesMonth'>,
  now: Date,
  withinDays = CLOSING_SOON_DAYS,
): ClosingSoonInfo | null {
  if (program.applicationCycle === 'rolling') return null;

  if (program.closesOn) {
    const close = parseIsoDate(program.closesOn);
    if (!close) return null;
    const daysLeft = calendarDayDiff(now, close);
    if (daysLeft < 0 || daysLeft > withinDays) return null;
    return { daysLeft, lastMonth: false };
  }

  const info = resolveWindow(program, now);
  if (info.status !== 'open' || info.monthsLeftOpen !== 1) return null;
  return { daysLeft: null, lastMonth: true };
}
