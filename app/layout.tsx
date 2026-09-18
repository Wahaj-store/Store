import './globals.css';
import ClientLayout from '@/components/ClientLayout';
import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'),
  title: { default: 'وَهَج | تفاصيل صغيرة تصنع وهجًا كبيرًا', template: '%s | وَهَج' },
  description: 'وَهَج — إكسسوارات عصرية بلمسة عربية راقية.',
  applicationName: 'وَهَج',
  icons: { icon: '/icon.svg' }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
