import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from '@/lib/config';
import { Masthead } from '@/components/Masthead';
import { UnverifiedBanner } from '@/components/UnverifiedBanner';
import { Colophon } from '@/components/Colophon';

/**
 * Two typefaces with one job each. Plex Sans carries the prose; Plex Mono
 * carries every number, month and status, so the data reads like a timetable
 * and lines up in a column wherever it appears.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_TAGLINE}`,
    template: `%s — ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#e9ece7',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-MY" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <a
          href="#main"
          className="skip-link"
        >
          Skip to content
        </a>
        <Masthead />
        <UnverifiedBanner />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Colophon />
      </body>
    </html>
  );
}
