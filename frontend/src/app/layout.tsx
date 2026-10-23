import type { Metadata } from 'next';
import { Instrument_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const sans = Instrument_Sans({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = { title: 'ReachInbox Scheduler', description: 'Schedule and track outbound email.' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
