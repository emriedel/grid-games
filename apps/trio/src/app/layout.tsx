import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from '@vercel/analytics/react';
import { Providers } from './Providers';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trio | Nerdcube Daily",
  description: "A daily Set-style puzzle. Find all five trios to clear the board!",
  keywords: ["set game", "puzzle", "trio", "daily game", "card game", "pattern matching"],
  metadataBase: new URL("https://nerdcube.games"),
  openGraph: {
    title: "Trio | Nerdcube Daily",
    description: "A daily Set-style puzzle. Find all five trios to clear the board!",
    url: "https://nerdcube.games/trio",
    siteName: "Nerdcube Daily",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trio | Nerdcube Daily",
    description: "A daily Set-style puzzle. Find all five trios to clear the board!",
  },
  icons: {
    icon: "https://nerdcube.games/icons/trio.png",
    apple: "https://nerdcube.games/icons/trio.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#171717",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-neutral-900`}
      >
        <Providers>
          {children}
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
