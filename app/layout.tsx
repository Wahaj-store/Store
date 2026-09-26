import './globals.css';
import ClientLayout from '@/components/ClientLayout';
import { ThemeProvider } from 'next-themes';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import { ReactNode } from 'react';

const wahajFont = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-wahaj',
  preload: true,
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'),
  title: { default: 'وَهَج | تفاصيل صغيرة تصنع وهجًا كبيرًا', template: '%s | وَهَج' },
  description: 'وَهَج — إكسسوارات عصرية بلمسة عربية راقية.',
  applicationName: 'وَهَج',
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={wahajFont.variable}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
