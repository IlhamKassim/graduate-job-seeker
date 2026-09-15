import type { Program } from '@/types';
import { calendarDayDiff, parseIsoDate } from '@/lib/iso-date';

/** A verified row older than this should be re-read against the employer page. */
export const AUDIT_MAX_AGE_DAYS = 32;

export interface AuditRow {
  id: string;
  employer: string;
  name: string;
  checkedOn: string | null;
  ageDays: number | null;
  sourceUrl: string;
  due: boolean;
}

export function auditWindows(
  programs: Program[],
  now: Date,
  maxAgeDays = AUDIT_MAX_AGE_DAYS,
): AuditRow[] {
  return programs
    .filter((program) => program.dataConfidence === 'verified')
    .map((program) => {
      const checked = program.checkedOn ? parseIsoDate(program.checkedOn) : null;
      const ageDays = checked ? calendarDayDiff(checked, now) : null;
      return {
        id: program.id,
        employer: program.employer,
        name: program.name,
        checkedOn: program.checkedOn,
        ageDays,
        sourceUrl: program.sourceUrl,
        due: ageDays === null || ageDays > maxAgeDays,
      };
    })
    .sort((a, b) => (b.ageDays ?? 9999) - (a.ageDays ?? 9999) || a.employer.localeCompare(b.employer));
}

export function formatAudit(rows: AuditRow[]): string {
  const lines = [
    'id\temployer\tcheckedOn\tageDays\tdue\tsourceUrl',
    ...rows.map((row) =>
      [
        row.id,
        row.employer,
        row.checkedOn ?? 'missing',
        row.ageDays ?? '?',
        row.due ? 'DUE' : 'ok',
        row.sourceUrl,
      ].join('\t'),
    ),
  ];
  return lines.join('\n');
}
