import type { Metadata } from 'next';
import { DebugView } from '@/components/DebugView';

export const metadata: Metadata = {
  title: 'Session log',
  description: 'Event log and waitlist captured in this browser during a Langkah pilot session.',
};

export default function DebugPage() {
  return <DebugView />;
}
