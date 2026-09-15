'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAME } from '@/lib/config';
import { TESTID } from '@/lib/testids';

const LINKS = [
  { href: '/', label: 'Profile', testId: TESTID.navHome },
  { href: '/shortlist/', label: 'Shortlist', testId: TESTID.navShortlist },
  { href: '/calendar/', label: 'Calendar', testId: TESTID.navCalendar },
] as const;

/** The twelve-cell track, shrunk to a glyph. Same motif as every window strip. */
function Wordmark() {
  return (
    <span className="flex items-baseline gap-2.5">
      <span aria-hidden className="flex h-3.5 w-[52px] shrink-0 self-center border border-ink">
        {Array.from({ length: 12 }, (_, index) => (
          <span
            key={index}
            className={`flex-1 ${index > 0 ? 'border-l border-rule-soft' : ''} ${
              index >= 4 && index <= 6 ? 'bg-signal' : ''
            }`}
          />
        ))}
      </span>
      <span className="text-[1.0625rem] font-semibold tracking-[-0.025em]">{APP_NAME}</span>
    </span>
  );
}

export function Masthead() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href.replace(/\/$/, ''));

  return (
    <header className="rule-double bg-paper">
      <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 sm:px-6">
        <Link
          href="/"
          className="flex min-h-11 items-center py-1 text-ink no-underline"
          aria-label={`${APP_NAME} home`}
        >
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="-mx-2">
          <ul className="flex items-center">
            {LINKS.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    data-testid={link.testId}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-11 items-center px-2.5 font-mono text-[0.8125rem] no-underline transition-colors sm:px-3 ${
                      active
                        ? 'text-ink underline decoration-ink decoration-2 underline-offset-[7px]'
                        : 'text-slate hover:text-ink'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
