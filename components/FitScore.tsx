'use client';

import { useId, useState } from 'react';
import type { FitResult } from '@/types';
import { fitBand } from '@/lib/fit';
import { trackFitBreakdownExpanded } from '@/lib/analytics';
import { TESTID } from '@/lib/testids';

/**
 * A fit score is never shown as a bare number. The number and the control that
 * opens its four components are the same element, so there is no way to see a
 * total without a way to take it apart.
 */
export function FitScore({
  fit,
  defaultOpen = false,
  align = 'right',
}: {
  fit: FitResult;
  defaultOpen?: boolean;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) trackFitBreakdownExpanded(fit.programId, fit.total);
  };

  return (
    <div className={align === 'right' ? 'sm:text-right' : ''}>
      <button
        type="button"
        data-testid={TESTID.fitToggle}
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={`group flex min-h-11 w-full items-baseline gap-2 border border-transparent px-1 py-1 text-left transition-colors hover:border-rule hover:bg-surface ${
          align === 'right' ? 'sm:w-auto sm:justify-end' : ''
        }`}
      >
        <span
          data-testid={TESTID.fitTotal}
          data-total={fit.total}
          className="font-mono text-[1.75rem] font-medium leading-none tracking-[-0.02em] text-ink"
        >
          {fit.total}
        </span>
        <span className="flex flex-col items-start gap-0.5">
          <span className="font-mono text-micro leading-none text-slate">/ 100</span>
          <span className="text-[0.8125rem] leading-none text-slate underline decoration-rule decoration-dotted underline-offset-[3px] group-hover:decoration-ink">
            {open ? 'Hide the four parts' : `${fitBand(fit.total)} — see the four parts`}
          </span>
        </span>
      </button>

      <div
        id={panelId}
        data-testid={TESTID.fitBreakdown}
        hidden={!open}
        className={`mt-2 border border-rule bg-surface p-3 text-left sm:p-4 ${open ? 'animate-reveal' : ''}`}
      >
        <p className="mb-3 text-[0.8125rem] leading-snug text-ink-80">
          Four fixed weights, added together. Nothing here is learned from data or estimated
          — the same profile always produces the same {fit.total}.
        </p>

        <ul className="flex flex-col gap-3">
          {fit.breakdown.map((component) => (
            <li key={component.key} data-testid={TESTID.fitComponent} data-component={component.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono text-[0.75rem] text-ink">{component.label}</span>
                <span className="shrink-0 font-mono text-[0.75rem] tabular text-ink">
                  {component.earned}
                  <span className="text-slate"> / {component.max}</span>
                </span>
              </div>
              <div
                className="mt-1 h-1.5 w-full border border-rule bg-white"
                role="presentation"
              >
                <div
                  className="h-full bg-ink"
                  style={{ width: `${(component.earned / component.max) * 100}%` }}
                />
              </div>
              <p className="mt-1.5 text-[0.8125rem] leading-snug text-slate">{component.note}</p>
            </li>
          ))}
        </ul>

        <div className="rule-top mt-3 flex items-baseline justify-between gap-3 pt-2">
          <span className="font-mono text-[0.75rem] text-ink">Total</span>
          <span className="font-mono text-[0.75rem] tabular text-ink">
            {fit.components.fieldAlignment} + {fit.components.cgpaHeadroom} +{' '}
            {fit.components.locationFit} + {fit.components.sectorInterest} = {fit.total}
          </span>
        </div>
      </div>
    </div>
  );
}
