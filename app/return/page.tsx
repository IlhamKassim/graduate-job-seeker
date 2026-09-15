import type { Metadata } from 'next';
import { APP_NAME } from '@/lib/config';
import { ReturnRequestForm } from '@/components/ReturnRequestForm';

export const metadata: Metadata = {
  title: 'Open an emailed shortlist',
  description: `Ask ${APP_NAME} to email a one-time link that rebuilds your shortlist on this device.`,
};

export default function ReturnPage() {
  return (
    <div className="mx-auto w-full max-w-[62ch] px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.25rem]">
        Open an emailed shortlist
      </h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-80">
        The seven answers live on the phone that typed them. If you left an address after a
        shortlist, we can email a link that restores those answers here. There is still no
        password and no sign-in. The link works once, for seven days.
      </p>
      <ReturnRequestForm />
    </div>
  );
}
