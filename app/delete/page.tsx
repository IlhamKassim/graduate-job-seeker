import type { Metadata } from 'next';
import { APP_NAME } from '@/lib/config';
import { DeleteRequestForm } from '@/components/DeleteRequestForm';

export const metadata: Metadata = {
  title: 'Delete a waitlist address',
  description: `Ask ${APP_NAME} to email a one-time link that deletes a waitlist address and the answers stored with it.`,
};

export default function DeletePage() {
  return (
    <div className="mx-auto w-full max-w-[62ch] px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.25rem]">
        Delete a waitlist address
      </h1>
      <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-80">
        If you left an address after a shortlist, we can email a link that deletes that address
        and the seven answers stored with it. The page does not say whether the address is on the
        list. The link works once, for seven days.
      </p>
      <DeleteRequestForm />
    </div>
  );
}
