import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nerdcube Games',
  description: 'A collection of daily word puzzle games. Challenge yourself with a new puzzle every day.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
