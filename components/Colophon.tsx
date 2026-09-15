import Link from 'next/link';
import { APP_NAME, DATA_SLICE } from '@/lib/config';

export function Colophon() {
  return (
    <footer className="rule-top mt-16 bg-paper">
      <div className="mx-auto w-full max-w-[1180px] px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-[46ch]">
            <p className="text-[0.9375rem] leading-relaxed text-ink">
              {APP_NAME} holds {DATA_SLICE.verifiedCount} programmes checked against employer
              pages
              {DATA_SLICE.checkedOn ? ` on ${DATA_SLICE.checkedOn}` : ''}, plus{' '}
              {DATA_SLICE.sampleCount} sample records kept off the default shortlist. Your
              profile stays in this browser unless you leave an address after a shortlist, in
              which case we can email a one-time link to restore it.
            </p>
            <p className="mt-3 text-[0.875rem] leading-relaxed text-slate">
              The fit score is a transparent sum of four fixed weights, shown in full on every
              row. It is not a forecast of whether you will be hired, and it cannot be.
            </p>
          </div>

          <nav aria-label="Pilot tools" className="font-mono text-[0.8125rem]">
            <ul className="flex flex-col gap-2">
              <li>
                <Link href="/" className="inline-flex min-h-11 items-center text-slate underline-offset-4 hover:text-ink">
                  Profile
                </Link>
              </li>
              <li>
                <Link href="/shortlist/" className="inline-flex min-h-11 items-center text-slate underline-offset-4 hover:text-ink">
                  Shortlist
                </Link>
              </li>
              <li>
                <Link href="/calendar/" className="inline-flex min-h-11 items-center text-slate underline-offset-4 hover:text-ink">
                  Calendar
                </Link>
              </li>
              <li>
                <Link href="/debug/" className="inline-flex min-h-11 items-center text-slate underline-offset-4 hover:text-ink">
                  Session log
                </Link>
              </li>
              <li>
                <Link href="/return/" className="inline-flex min-h-11 items-center text-slate underline-offset-4 hover:text-ink">
                  Open emailed shortlist
                </Link>
              </li>
              <li>
                <Link href="/privacy/" className="inline-flex min-h-11 items-center text-slate underline-offset-4 hover:text-ink">
                  Privacy
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
