import type { Metadata } from 'next';
import { DeleteConfirm } from '@/components/DeleteConfirm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Confirming deletion',
  robots: { index: false, follow: false },
};

export default async function DeleteTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <div className="mx-auto w-full max-w-[62ch] px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
      <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-ink sm:text-[2.25rem]">
        Confirming deletion
      </h1>
      <DeleteConfirm token={token} />
    </div>
  );
}
