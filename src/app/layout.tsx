import type { Metadata } from 'next';
import './globals.css';
import { Alegreya } from 'next/font/google';
import { cn } from '@/lib/utils';
import { AppProviders } from '@/app/providers';
import { Toaster } from '@/components/ui/toaster';

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
      </head>
      <body className={cn('font-body antialiased', alegreya.className)}>
        <AppProviders>
          <main>{children}</main>
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
