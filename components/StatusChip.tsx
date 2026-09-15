import type { WindowStatus } from '@/types';
import { TESTID } from '@/lib/testids';

/**
 * Three states, one grammar: filled means open, outlined means opening, greyed
 * means closed. The same three treatments the window strip uses.
 */
export function StatusChip({
  status,
  label,
  testable = true,
}: {
  status: WindowStatus | null;
  label?: string;
  testable?: boolean;
}) {
  if (!status) {
    return (
      <span
        className="chip-status chip-status--closed"
        aria-hidden
        data-testid={testable ? TESTID.windowStatus : undefined}
        data-status="unknown"
      >
        <span className="opacity-0">Checking</span>
      </span>
    );
  }

  const text =
    label ?? (status === 'open' ? 'Open' : status === 'opening_soon' ? 'Opening soon' : 'Closed');

  return (
    <span
      data-testid={testable ? TESTID.windowStatus : undefined}
      data-status={status}
      className={`chip-status chip-status--${status}`}
    >
      {status === 'open' ? <span aria-hidden className="h-1.5 w-1.5 bg-ink" /> : null}
      {text}
    </span>
  );
}
