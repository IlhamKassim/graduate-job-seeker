import type { Metadata } from 'next';
import { ShortlistView } from '@/components/ShortlistView';

export const metadata: Metadata = {
  title: 'Your shortlist',
  description:
    'Graduate programmes you are eligible for, ranked by a transparent four-part fit score, with the ones that ruled you out and why.',
};

export default function ShortlistPage() {
  return <ShortlistView />;
}
