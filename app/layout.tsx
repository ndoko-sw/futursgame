import './globals.css';
import type { Metadata } from 'next';
import { Work_Sans } from 'next/font/google';
import { GameProvider } from '@/lib/game-context';
import GameHeader from '@/components/game-header';
import { Toaster } from '@/components/ui/sonner';

const workSans = Work_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-work-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Futurs Drops — Fashion Brand Simulation',
  description: 'Wear meaning, not labels.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={workSans.variable}>
      <head>
        <meta name="color-scheme" content="light" />
        <meta name="theme-color" content="#ffffff" />
      </head>
      <body className={workSans.className}>
        <GameProvider>
          <GameHeader />
          <main style={{ minHeight: '100dvh', background: '#fff', paddingBottom: 72 }}>{children}</main>
          <Toaster />
        </GameProvider>
      </body>
    </html>
  );
}
