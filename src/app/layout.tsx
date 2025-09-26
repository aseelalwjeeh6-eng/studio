import type { Metadata } from 'next';
import './globals.css';
import { Alegreya } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AppProviders } from '@/app/providers';
import { Toaster } from '@/components/ui/toaster';
import Hearts from '@/components/shared/Hearts';

const alegreya = Alegreya({
  subsets: ['latin'],
  variable: '--font-alegreya',
});

export const metadata: Metadata = {
  title: 'اصيل سينما – Aseel SOSO',
  description: 'منصة مشاهدة أفلام للعشاق',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased', alegreya.className)}>
        <AppProviders>
          <main>{children}</main>
          <Hearts />
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
