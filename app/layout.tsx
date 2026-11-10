import './globals.css';
import ClientLayout from '@/components/ClientLayout';
import { ThemeProvider } from 'next-themes';
import { Tajawal } from 'next/font/google';
import { ReactNode } from 'react';
import { headers } from 'next/headers';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://wahaj-store.vercel.app').replace(/\/+$/, '');

const wahajFont = Tajawal({
  subsets: ['arabic', 'latin'],
  // الأوزان المستخدمة فعليًا في الواجهة؛ تقليلها يخفّض حجم الخط الأولي.
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-wahaj',
  preload: true,
});

// Per-request CSP nonces must be added to the rendered HTML, so pages cannot be prerendered.
export const dynamic = 'force-dynamic';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'وَهَج | تفاصيل صغيرة تصنع وهجًا كبيرًا', template: '%s | وَهَج' },
  description: 'وَهَج — إكسسوارات عصرية بلمسة عربية راقية.',
  applicationName: 'وَهَج',
  icons: { icon: '/wahaj-favicon-v2.ico', shortcut: '/wahaj-favicon-v2.ico' },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-csp-nonce') || undefined;
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={wahajFont.variable}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem nonce={nonce}>
          <ClientLayout>{children}</ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  );
}
