// مسار الملف: components/SiteFooter.tsx

'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type SettingMap = Record<string, any>;

export default function SiteFooter() {
  const [settings, setSettings] = useState<SettingMap>({});

  useEffect(() => {
    let mounted = true;

    fetch('/api/settings', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!mounted || !data) return;
        setSettings(data.settings || {});
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  const parse = (value: any, fallback: any) => {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };

  const footerLinks = parse(
    settings.footer_links,
    [
      { label: 'تواصل معنا', href: '/contact' },
      { label: 'الأسئلة الشائعة', href: '/faq' }
    ]
  );

  return (
    <footer className="wahaj-footer border-t border-[var(--gold)]/20 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
      <div className="container">
        <div className="wahaj-footer__main">

          <div className="wahaj-footer__brand">
            <div className="wahaj-footer__logo" aria-label="وَهَج">
              <Image
                src="/images/wahaj.logo.png"
                alt="وَهَج"
                width={90}
                height={50}
                className="wahaj-footer__logo-image"
                priority
              />
            </div>

            <p className="wahaj-footer__bio">
              {settings.brand_story || 'تفاصيل صغيرة تصنع وهجًا كبيرًا.'}
            </p>

            <p className="wahaj-footer__tagline">
              {settings.brand_tagline || 'لأن أناقتك تستحق أن تتألّق.'}
            </p>
          </div>

          <div className="wahaj-footer__column">
            <h3>روابط سريعة</h3>

            <div className="wahaj-footer__links">
              {footerLinks
                .filter((x: any) => x && x.href && x.label && x.active !== false)
                .slice(0, 8)
                .map((x: any) => (
                  <a key={`${x.href}-${x.label}`} href={x.href}>
                    {x.label}
                  </a>
                ))}

              <a href="/shop">تسوقي الآن</a>
            </div>
          </div>

          <div className="wahaj-footer__column">
            <h3>خدمة العملاء</h3>

            <div className="wahaj-footer__links">
              <a href="/contact">تواصل معنا</a>
              <a href="/faq">الأسئلة الشائعة</a>
              <a href="/policies/shipping">الشحن والتوصيل</a>
              <a href="/policies/returns">الاسترجاع والاستبدال</a>
              <a href="/policies/privacy">الخصوصية</a>
            </div>
          </div>

          <div className="wahaj-footer__column">
            <h3>طرق الدفع</h3>

            <p className="wahaj-footer__payment-text">
              خيارات دفع متاحة لتجربة شراء أكثر راحة.
            </p>

            {/* صورة طرق الدفع المرفقة */}
            <div className="wahaj-footer__payments">
              <Image
                src="/images/payment-methods.png"
                alt="طرق الدفع المتاحة"
                width={300}
                height={100}
                className="wahaj-footer__payments-image"
              />
            </div>
          </div>

        </div>

        <div className="wahaj-footer__bottom">
          <span>
            © {new Date().getFullYear()} وَهَج — جميع الحقوق محفوظة
          </span>

          <span>
            {settings.brand_tagline || 'تفاصيل صغيرة تصنع وهجًا كبيرًا.'}
          </span>
        </div>
      </div>
    </footer>
  );
}
