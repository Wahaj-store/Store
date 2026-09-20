'use client';

import { useEffect, useState } from 'react';
import { Banknote, Smartphone, QrCode, CreditCard } from 'lucide-react';

type SettingMap = Record<string, any>;

export default function SiteFooter() {
  const [settings, setSettings] = useState<SettingMap>({});
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    fetch('/api/settings', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!mounted || !data) return;
        setSettings(data.settings || {});
        
        // فلترة طرق الدفع لجلب المفعلة فقط (enabled === true)
        const allPayments = Array.isArray(data.payments) ? data.payments : [];
        const activePayments = allPayments.filter((p: any) => p.enabled !== false && p.enabled !== 0);
        setPayments(activePayments);
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

  // دالة لتحديد الأيقونة الاحترافية المناسبة لكل طريقة دفع
  const getPaymentIcon = (methodName: string) => {
    const name = methodName?.toLowerCase() || '';
    if (name.includes('cash') || name.includes('استلام')) {
      return <Banknote size={18} className="text-[var(--gold)] shrink-0" />;
    } else if (name.includes('vodafone') || name.includes('فودافون') || name.includes('محفظة') || name.includes('wallet')) {
      return <Smartphone size={18} className="text-red-500 shrink-0" />;
    } else if (name.includes('insta') || name.includes('انستاباي')) {
      return <QrCode size={18} className="text-purple-400 shrink-0" />;
    } else {
      return <CreditCard size={18} className="text-[var(--gold)] shrink-0" />;
    }
  };

  return (
    <footer className="wahaj-footer border-t border-[var(--gold)]/20 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
      <div className="container">
        <div className="wahaj-footer__main">

          <div className="wahaj-footer__brand">
            <span className="wahaj-footer__logo">
              {settings.brand_name || 'وَهَج'}
            </span>

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

            {/* عرض طرق الدفع بأيقونات SVG احترافية بجانبها */}
            <div className="wahaj-footer__payments flex flex-col gap-2.5 pt-1">
              {payments.length > 0 ? (
                payments.map((payment: any) => {
                  const label = payment.label || payment.name || payment.method;
                  return (
                    <div
                      key={payment.method || payment.id}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-card border border-border/60 shadow-sm transition hover:border-[var(--gold)]/50 text-foreground"
                    >
                      {getPaymentIcon(label)}
                      <span className="text-xs md:text-sm font-medium">
                        {label}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-card border border-border/60 text-foreground">
                  <Banknote size={18} className="text-[var(--gold)] shrink-0" />
                  <span className="text-xs md:text-sm font-medium">الدفع عند الاستلام</span>
                </div>
              )}
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
