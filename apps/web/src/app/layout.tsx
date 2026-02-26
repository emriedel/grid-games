import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { Providers } from './Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nerdcube Daily – Free Daily Word & Puzzle Games',
  description: 'Challenge yourself with free daily word and puzzle games. New puzzles every day including Dabble, Jumble, Trio, and more.',
  keywords: ['daily games', 'word games', 'puzzle games', 'free online games', 'daily puzzles'],
  metadataBase: new URL('https://nerdcube.games'),
  openGraph: {
    title: 'Nerdcube Daily – Free Daily Word & Puzzle Games',
    description: 'Challenge yourself with free daily word and puzzle games. New puzzles every day.',
    url: 'https://nerdcube.games',
    siteName: 'Nerdcube Daily',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nerdcube Daily – Free Daily Word & Puzzle Games',
    description: 'Challenge yourself with free daily word and puzzle games. New puzzles every day.',
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
