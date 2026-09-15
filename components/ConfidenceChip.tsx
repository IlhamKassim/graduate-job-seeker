import type { DataConfidence } from '@/types';

export function ConfidenceChip({ confidence }: { confidence: DataConfidence }) {
  const checked = confidence === 'verified';
  return (
    <span
      data-testid="data-confidence"
      data-confidence={confidence}
      className={`chip-status ${checked ? 'chip-status--verified' : 'chip-status--sample'}`}
    >
      {checked ? 'Checked' : 'Sample'}
    </span>
  );
}
