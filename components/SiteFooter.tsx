'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

type SettingMap = Record<string, unknown>;
type FooterLink = { label: string; href: string; active?: boolean };
type SocialNetwork = 'facebook' | 'instagram' | 'tiktok';

const SOCIAL_NETWORKS: { key: SocialNetwork; label: string; setting: string }[] = [
  { key: 'facebook', label: 'فيسبوك', setting: 'social_facebook' },
  { key: 'instagram', label: 'إنستجرام', setting: 'social_instagram' },
  { key: 'tiktok', label: 'تيك توك', setting: 'social_tiktok' },
];

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function safeExternalUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function SocialIcon({ network }: { network: SocialNetwork }) {
  if (network === 'facebook') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.35 21v-8.2h2.76l.41-3.2h-3.17V7.56c0-.93.26-1.56 1.59-1.56h1.7V3.14c-.3-.04-1.33-.14-2.53-.14-2.5 0-4.21 1.53-4.21 4.34V9.6H7.07v3.2h2.83V21h3.45Z" /></svg>;
  }

  if (network === 'instagram') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5.2" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="17.75" cy="6.55" r="1.15" fill="currentColor" /></svg>;
  }

  return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19.6 7.28a6.65 6.65 0 0 1-4.02-1.35v8.42a5.67 5.67 0 1 1-5.67-5.67c.35 0 .7.03 1.03.1v3.13a2.57 2.57 0 1 0 1.54 2.36V2.5h3.1a6.67 6.67 0 0 0 4.02 4.02v.76Z" /></svg>;
}

export default function SiteFooter() {
  const [settings, setSettings] = useState<SettingMap>({});

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/settings', { signal: controller.signal, cache: 'no-store' })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (data?.settings && typeof data.settings === 'object') {
          setSettings(data.settings as SettingMap);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  const footerLinks = parseJson<FooterLink[]>(settings.footer_links, [
    { label: 'تواصل معنا', href: '/contact' },
    { label: 'الأسئلة الشائعة', href: '/faq' },
  ]);
  const quickLinks = Array.isArray(footerLinks)
    ? footerLinks.filter(link => link && link.href && link.label && link.active !== false).slice(0, 5)
    : [];
  const brandName = typeof settings.brand_name === 'string' && settings.brand_name.trim()
    ? settings.brand_name
    : 'وَهَج';
  const brandStory = typeof settings.brand_story === 'string' && settings.brand_story.trim()
    ? settings.brand_story
    : 'تفاصيل صغيرة تصنع وهجًا كبيرًا.';
  const tagline = typeof settings.brand_tagline === 'string' && settings.brand_tagline.trim()
    ? settings.brand_tagline
    : 'لأن أناقتك تستحق أن تتألّق.';

  return (
    <footer className="wahaj-footer" dir="rtl">
      <div className="container">
        <div className="wahaj-footer__topline">
        </div>

        <div className="wahaj-footer__main">
          <section className="wahaj-footer__brand" aria-label={`عن ${brandName}`}>
            <Link className="wahaj-footer__logo" href="/" aria-label={`${brandName} — الصفحة الرئيسية`}>
              <Image
                src="/images/wahaj.logo.png"
                alt={brandName}
                width={180}
                height={78}
                className="wahaj-footer__logo-image"
              />
            </Link>
            <p className="wahaj-footer__bio">{brandStory}</p>
            <p className="wahaj-footer__tagline">{tagline}</p>

            <div className="wahaj-footer__social-block">
              <h3>تابعينا على</h3>
              <div className="wahaj-footer__socials" aria-label="حسابات وَهَج على شبكات التواصل الاجتماعي">
                {SOCIAL_NETWORKS.map(({ key, label, setting }) => {
                  const href = safeExternalUrl(settings[setting]);
                  const icon = <SocialIcon network={key} />;
                  return href ? (
                    <a
                      key={key}
                      className="wahaj-footer__social-link"
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`تابعي وَهَج على ${label}`}
                      title={label}
                    >
                      {icon}
                    </a>
                  ) : (
                    <span
                      key={key}
                      className="wahaj-footer__social-link is-unconfigured"
                      aria-label={`${label} — أضيفي الرابط من إعدادات المتجر`}
                      title={`${label} — أضيفي الرابط من إعدادات المتجر`}
                    >
                      {icon}
                    </span>
                  );
                })}
              </div>
            </div>
          </section>

          <nav className="wahaj-footer__column" aria-label="روابط المتجر">
            <h2>اكتشفي وَهَج</h2>
            <div className="wahaj-footer__links">
              <Link href="/shop">تسوقي الآن</Link>
              <Link href="/about">قصتنا</Link>
              {quickLinks.map(link => (
                <Link key={`${link.href}-${link.label}`} href={link.href}>{link.label}</Link>
              ))}
            </div>
          </nav>

          <nav className="wahaj-footer__column" aria-label="الدعم والسياسات">
            <h2>نحن إلى جانبك</h2>
            <div className="wahaj-footer__links">
              <Link href="/contact">تواصلي معنا</Link>
              <Link href="/faq">الأسئلة الشائعة</Link>
              <Link href="/policies/shipping">الشحن والتوصيل</Link>
              <Link href="/policies/returns">الاستبدال والاسترجاع</Link>
              <Link href="/policies/privacy">سياسة الخصوصية</Link>
              <Link href="/policies/terms">الأحكام والشروط</Link>
            </div>
          </nav>

          <section className="wahaj-footer__column wahaj-footer__payment-column" aria-labelledby="wahaj-footer-payment-title">
            <h2 id="wahaj-footer-payment-title">تسوقي براحة واطمئنان</h2>
            <p className="wahaj-footer__payment-text">خيارات دفع متاحة لتجربة شراء سهلة وآمنة.</p>
            <div className="wahaj-footer__payments">
              <Image
                src="/images/payment-methods.png"
                alt="طرق الدفع المتاحة في متجر وَهَج"
                width={300}
                height={100}
                className="wahaj-footer__payments-image"
              />
            </div>
          </section>
        </div>

        <div className="wahaj-footer__bottom">
          <span>© {new Date().getFullYear()} {brandName} — جميع الحقوق محفوظة</span>
          <span>{tagline}</span>
          <Link href="/policies/terms">الأحكام والشروط</Link>
        </div>
      </div>
    </footer>
  );
}
