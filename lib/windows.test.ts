import { describe, expect, it } from 'vitest';
import { monthRangeLabel, resolveWindow, windowMonths, windowWraps } from '@/lib/windows';
import { programFixture } from '@/lib/test-fixtures';

describe('windowMonths', () => {
  it('lists a contiguous seasonal range', () => {
    expect(windowMonths(7, 9)).toEqual([7, 8, 9]);
  });

  it('wraps past December', () => {
    expect(windowMonths(11, 2)).toEqual([11, 12, 1, 2]);
    expect(windowWraps(11, 2)).toBe(true);
    expect(windowWraps(7, 9)).toBe(false);
  });
});

describe('resolveWindow', () => {
  it('treats a rolling cycle as open year-round without inventing a close month', () => {
    const info = resolveWindow(
      programFixture({ applicationCycle: 'rolling', opensMonth: 1, closesMonth: 1 }),
      new Date('2026-03-15T00:00:00Z'),
    );
    expect(info.status).toBe('open');
    expect(info.months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(info.wraps).toBe(false);
    expect(info.monthsLeftOpen).toBe(12);
    expect(info.rangeLabel).toBe('Year-round');
    expect(info.label).toMatch(/year-round/i);
    expect(info.label).not.toMatch(/December|closes/i);
  });

  it('marks a seasonal window open, opening soon, or closed against a pinned date', () => {
    const seasonal = programFixture({ applicationCycle: 'seasonal', opensMonth: 7, closesMonth: 9 });

    const open = resolveWindow(seasonal, new Date(2026, 6, 1));
    expect(open.status).toBe('open');
    expect(open.monthsLeftOpen).toBe(3);
    expect(open.shortLabel).toBe('Open');

    const soon = resolveWindow(seasonal, new Date(2026, 4, 1));
    expect(soon.status).toBe('opening_soon');
    expect(soon.monthsUntilOpen).toBe(2);
    expect(soon.shortLabel).toBe('Opening soon');

    const closed = resolveWindow(seasonal, new Date(2026, 1, 1));
    expect(closed.status).toBe('closed');
    expect(closed.monthsUntilOpen).toBe(5);
    expect(closed.shortLabel).toBe('Closed');
  });

  it('keeps a wrapping seasonal window open across the year boundary', () => {
    const wrapping = programFixture({ applicationCycle: 'seasonal', opensMonth: 11, closesMonth: 2 });
    expect(resolveWindow(wrapping, new Date(2026, 11, 1)).status).toBe('open');
    expect(resolveWindow(wrapping, new Date(2027, 0, 1)).status).toBe('open');
    expect(resolveWindow(wrapping, new Date(2026, 5, 1)).status).toBe('closed');
    expect(monthRangeLabel(11, 2)).toBe('November to February');
  });
});
