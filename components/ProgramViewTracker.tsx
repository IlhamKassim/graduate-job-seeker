'use client';

import { trackProgramDetailOpened } from '@/lib/analytics';
import { useOnceAfterMount } from '@/lib/hooks';

/** Fires once when a programme page is actually opened in the browser. */
export function ProgramViewTracker({
  programId,
  employer,
}: {
  programId: string;
  employer: string;
}) {
  useOnceAfterMount(
    () => trackProgramDetailOpened(programId, employer),
    [programId, employer],
  );
  return null;
}
