import type { Metadata } from 'next';
import './globals.css';
import '@livekit/components-styles';
import { Alegreya } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AppProviders } from '@/app/providers';
import Hearts from '@/components/shared/Hearts';
import Script from 'next/script';

const alegreya = Alegreya({
  subsets: ['latin'],
  variable: '--font-alegreya',
});

export const metadata: Metadata = {
  title: 'اصيل سينما – Aseel SOSO',
  description: 'منصة مشاهدة أفلام للعشاق',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
      </head>
      <body className={cn('font-body antialiased', alegreya.className)}>
        <Script id="suppress-datachannel-error" strategy="beforeInteractive">
          {`
            const originalConsoleError = console.error;
            console.error = (...args) => {
              if (typeof args[0] === 'string' && args[0].includes('Unknown DataChannel error')) {
                return;
              }
              originalConsoleError(...args);
            };
          `}
        </Script>
        <AppProviders>
          <Hearts />
          <main>{children}</main>
        </AppProviders>
      </body>
    </html>
  );
}
