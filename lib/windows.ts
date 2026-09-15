import type { Program, WindowStatus } from '@/types';
import { MONTH_LONG, MONTH_SHORT } from '@/data/taxonomy';

/**
 * Application windows are stored as a month range with no year, because that is
 * all the seed data honestly knows: employers run roughly the same window every
 * intake. Everything here therefore reasons about an annual cycle, and the copy
 * says "typically" rather than asserting a date.
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
  program: Pick<Program, 'opensMonth' | 'closesMonth'>,
  now: Date,
): WindowInfo {
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
