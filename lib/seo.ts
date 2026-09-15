import type { Program } from '@/types';
import { COUNTRY_LABEL, SECTOR_LABEL } from '@/data/taxonomy';
import { monthRangeLabel } from '@/lib/windows';

export function programmeTitle(program: Program): string {
  return `${program.name} at ${program.employer}`;
}

/** Unique meta description built only from fields on the record. */
export function programmeDescription(program: Program): string {
  const where = `${program.cities.join(', ')}, ${COUNTRY_LABEL[program.country]}`;
  const window =
    program.applicationCycle === 'rolling'
      ? 'Applications are accepted year-round.'
      : `The published window is ${monthRangeLabel(program.opensMonth, program.closesMonth)}.`;
  const bar =
    program.minCGPA == null
      ? 'No CGPA cut-off is published.'
      : `The published CGPA bar is ${program.minCGPA.toFixed(2)}.`;
  const checked = program.checkedOn
    ? `Checked against the employer page on ${program.checkedOn}.`
    : 'This row is sample data.';
  return `${program.employer} ${program.name} (${SECTOR_LABEL[program.sector]}) in ${where}. ${window} ${bar} ${checked}`;
}

/** Lead paragraph on the programme page. Same facts as the description, in one breath. */
export function programmeLead(program: Program): string {
  return programmeDescription(program);
}
