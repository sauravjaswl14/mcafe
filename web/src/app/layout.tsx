import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cafe } from '@shared/catalog';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: `${cafe.name} · Specialty coffee & café menu`,
  description: cafe.tagline,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
