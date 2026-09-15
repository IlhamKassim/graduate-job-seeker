import type { ReactNode } from 'react';

/**
 * One numbered row on a paper form: index and label in the left gutter, the
 * control on the right, a hairline underneath. The number is a wayfinding
 * device for a seven-field form, not decoration.
 */
export function FormField({
  index,
  label,
  htmlFor,
  hint,
  error,
  errorId,
  optional = false,
  children,
}: {
  index: number;
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  errorId?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const number = String(index).padStart(2, '0');

  return (
    <div className="rule-top grid grid-cols-1 gap-x-8 gap-y-2 py-5 sm:grid-cols-[13.5rem_minmax(0,1fr)] sm:py-6">
      <div className="flex gap-3">
        <span aria-hidden className="mt-[3px] font-mono text-[0.75rem] leading-none text-slate">
          {number}
        </span>
        <div>
          {htmlFor ? (
            <label htmlFor={htmlFor} className="block text-[0.9375rem] font-medium leading-snug text-ink">
              {label}
              {optional ? <span className="font-normal text-slate"> (optional)</span> : null}
            </label>
          ) : (
            <span className="block text-[0.9375rem] font-medium leading-snug text-ink">
              {label}
              {optional ? <span className="font-normal text-slate"> (optional)</span> : null}
            </span>
          )}
          {hint ? <p className="mt-1 text-[0.8125rem] leading-snug text-slate">{hint}</p> : null}
        </div>
      </div>

      <div className="min-w-0">
        {children}
        {error ? (
          <p
            id={errorId}
            role="alert"
            className="animate-reveal mt-2 flex items-start gap-2 text-[0.8125rem] leading-snug text-oxblood"
          >
            <span aria-hidden className="mt-[5px] h-2 w-2 shrink-0 bg-oxblood" />
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
