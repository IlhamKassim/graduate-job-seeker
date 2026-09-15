import type { Metadata } from 'next';
import { CalendarView } from '@/components/CalendarView';

export const metadata: Metadata = {
  title: 'The year',
  description:
    'Every sample graduate-programme window laid across twelve months, with your graduation month marked.',
};

export default function CalendarPage() {
  return <CalendarView />;
}
