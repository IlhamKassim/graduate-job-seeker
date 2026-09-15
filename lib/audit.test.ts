import { describe, expect, it } from 'vitest';
import { VERIFIED_PROGRAMS } from '@/data/verified';
import { AUDIT_MAX_AGE_DAYS, auditWindows, formatAudit } from '@/lib/audit';
import { programFixture } from '@/lib/test-fixtures';

describe('auditWindows', () => {
  it('flags a verified row once it is older than the monthly cadence', () => {
    const fresh = programFixture({
      id: 'fresh',
      dataConfidence: 'verified',
      checkedOn: '2026-09-15',
    });
    const stale = programFixture({
      id: 'stale',
      employer: 'Stale Co',
      dataConfidence: 'verified',
      checkedOn: '2026-08-01',
    });
    const sample = programFixture({
      id: 'sample',
      dataConfidence: 'unverified',
      checkedOn: '2026-08-01',
    });

    const rows = auditWindows([fresh, stale, sample], new Date(2026, 8, 15), AUDIT_MAX_AGE_DAYS);
    expect(rows.map((row) => row.id)).toEqual(['stale', 'fresh']);
    expect(rows.find((row) => row.id === 'stale')?.due).toBe(true);
    expect(rows.find((row) => row.id === 'fresh')?.due).toBe(false);
  });

  it('prints a checklist the operator can walk with a browser', () => {
    const rows = auditWindows(VERIFIED_PROGRAMS, new Date(2026, 8, 15));
    const listing = formatAudit(rows);
    expect(listing).toMatch(/grab-cfo-graduate-programme/);
    expect(listing).toMatch(/celcomdigi-graduate-programme/);
    expect(listing).toMatch(/pwc-malaysia-graduate-programme/);
    expect(listing).toMatch(/rhb-banking-group-graduate-programme/);
    expect(rows.every((row) => row.due === false)).toBe(true);
  });
});
