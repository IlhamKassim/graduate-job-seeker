import type { Program } from '@/types';
import { STAGE_LABEL, STAGE_SHORT_LABEL } from '@/lib/prepare';
import { TESTID } from '@/lib/testids';

/**
 * The sequence a student is signing up for, drawn as a run of connected stops
 * rather than a list of bullets. Horizontal where there is room, vertical on a
 * phone, same numbering either way.
 */
export function StageTimeline({ program }: { program: Program }) {
  const count = program.stages.length;

  return (
    <div data-testid={TESTID.stageTimeline}>
      {/* Phone: a vertical run with the rule down the left. */}
      <ol className="md:hidden">
        {program.stages.map(({ stage, note }, index) => (
          <li
            key={`${stage}-${index}`}
            data-testid={TESTID.stageItem}
            data-stage={stage}
            data-index={index + 1}
            className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-3 pb-6 last:pb-0"
          >
            {index < count - 1 ? (
              <span
                aria-hidden
                className="absolute left-[0.8125rem] top-7 h-[calc(100%-1.75rem)] w-px bg-rule"
              />
            ) : null}
            <span className="relative z-10 flex h-7 w-7 items-center justify-center border border-ink bg-paper font-mono text-[0.75rem] tabular text-ink">
              {index + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <h3 className="text-[0.9375rem] font-semibold leading-snug text-ink">
                {STAGE_LABEL[stage]}
              </h3>
              <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-80">{note}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Desktop: the run laid out left to right, notes aligned beneath each stop. */}
      <div className="hidden md:block">
        <div className="relative flex">
          {program.stages.map(({ stage }, index) => (
            <div key={`${stage}-${index}`} className="relative flex-1">
              <span
                aria-hidden
                className={`absolute top-[0.8125rem] h-px bg-rule ${
                  index === 0
                    ? 'left-7 right-0'
                    : index === count - 1
                      ? 'left-0 right-[calc(100%-1.75rem)]'
                      : 'left-0 right-0'
                }`}
              />
              <span className="relative z-10 flex h-7 w-7 items-center justify-center border border-ink bg-paper font-mono text-[0.75rem] tabular text-ink">
                {index + 1}
              </span>
            </div>
          ))}
        </div>

        <ol className="mt-3 flex">
          {program.stages.map(({ stage, note }, index) => (
            <li
              key={`${stage}-${index}`}
              data-testid={TESTID.stageItem}
              data-stage={stage}
              data-index={index + 1}
              className="flex-1 pr-5 last:pr-0"
            >
              <h3 className="text-[0.9375rem] font-semibold leading-snug tracking-[-0.01em] text-ink">
                {STAGE_LABEL[stage]}
              </h3>
              <p className="mt-1.5 text-[0.875rem] leading-relaxed text-ink-80">{note}</p>
            </li>
          ))}
        </ol>

        <p className="mt-4 font-mono text-[0.75rem] text-slate">
          {program.stages.map(({ stage }) => STAGE_SHORT_LABEL[stage]).join('  →  ')}
        </p>
      </div>
    </div>
  );
}
