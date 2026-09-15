import Link from 'next/link';
import { APP_NAME } from '@/lib/config';

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-16 sm:px-6">
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
        That page is not in this build.
      </h1>
      <p className="mt-3 max-w-[54ch] text-[1rem] leading-relaxed text-ink-80">
        {APP_NAME} is a small pilot. If you followed a link here, it is stale or
        mistyped. The profile form is the way back in.
      </p>
      <p className="mt-6">
        <Link href="/" className="btn btn-primary">
          Back to the profile
        </Link>
      </p>
    </div>
  );
}
