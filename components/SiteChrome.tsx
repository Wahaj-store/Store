'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Menu, X, Search, User, Moon, Sun, ShoppingBag, MessageCircle } from 'lucide-react';

type SettingMap = Record<string, any>;

export default function SiteChrome() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const [menu, setMenu] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [settings, setSettings] = useState<SettingMap>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [themeSettings, setThemeSettings] = useState<any>(null);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;

    let mounted = true;

    fetch('/api/settings', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!mounted || !data) return;
        setSettings(data.settings || {});
        setPayments(Array.isArray(data.payments) ? data.payments : []);
        setThemeSettings(data.theme || null);
      })
      .catch(() => {});

    const sync = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('wahaj_cart') || '[]');
        setCartCount(cart.reduce((n: any, x: any) => n + Number(x.quantity || 0), 0));
      } catch {
        setCartCount(0);
      }
    };

    sync();
    window.addEventListener('wahaj_cart-change', sync);
    window.addEventListener('storage', sync);

    return () => {
      mounted = false;
      window.removeEventListener('wahaj_cart-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) return;
    if (themeSettings?.primaryColor) {
      document.documentElement.style.setProperty('--brand-gold', themeSettings.primaryColor);
    }
    if (themeSettings?.accentColor) {
      document.documentElement.style.setProperty('--gold', themeSettings.accentColor);
    }
  }, [pathname, themeSettings]);

  // استثناء لوحة التحكم فقط، والسماح بالظهور في الرئيسية وكل الصفحات الداخلية
  if (pathname?.startsWith('/admin')) return null;

  const parse = (value: any, fallback: any) => {
    try { return value ? JSON.parse(value) : fallback }
    catch { return fallback }
  };

  const headerMenu = parse(
    settings.header_menu,
    [
      { label: 'الرئيسية', href: '/' },
      { label: 'المتجر', href: '/shop' },
      { label: 'من نحن', href: '/about' }
    ]
  );

  const footerLinks = parse(
    settings.footer_links,
    [
      { label: 'تواصل معنا', href: '/contact' },
      { label: 'الأسئلة الشائعة', href: '/faq' }
    ]
  );

  const whatsapp = String(settings.whatsapp || '').replace(/\D/g, '');

  return (
    <>
      {/* إعلان المتجر العلوي */}
      {settings.announcement && (
        <div className="bg-[#171513] py-2 text-center text-xs text-[#F8F5EF]">
          {settings.announcement}
        </div>
      )}

      {/* الهيدر في أعلى الصفحة */}
      <header className="wahaj-header wahaj-header--luxury sticky top-0 z-40">
        <div className="container wahaj-header__inner">
          <div className="wahaj-header__brand">
            <button
              type="button"
              className="wahaj-header__menu md:hidden"
              onClick={() => setMenu(true)}
              aria-label="فتح القائمة"
              title="القائمة"
            >
              <Menu size={20} />
            </button>

            <a
              href="/"
              className="wahaj-header__logo"
              aria-label="وَهَج - الصفحة الرئيسية"
            >
              <span>{settings.brand_name || 'وَهَج'}</span>
              <small>Wahaj</small>
            </a>
          </div>

          <nav
            className="wahaj-header__nav hidden md:flex"
            aria-label="القائمة الرئيسية"
          >
            {headerMenu
              .filter((x: any) => x && x.href && x.label && x.active !== false)
              .map((x: any) => (
                <a
                  key={`${x.href}-${x.label}`}
                  href={x.href}
                  className={pathname === x.href ? 'is-active' : ''}
                >
                  {x.label}
                </a>
              ))}
          </nav>

          <div className="wahaj-header__actions">
            <a
              href="/shop"
              className="wahaj-header__action"
              aria-label="البحث"
              title="البحث"
            >
              <Search size={19} />
            </a>

            <a
              href="/account"
              className="wahaj-header__action"
              aria-label="حسابي"
              title="حسابي"
            >
              <User size={19} />
            </a>

            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="wahaj-header__action"
              aria-label="تبديل الوضع"
              title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            <a
              href="/cart"
              className="wahaj-header__action wahaj-header__cart"
              aria-label="السلة"
              title="السلة"
            >
              <ShoppingBag size={19} />
              {cartCount > 0 && (
                <span className="wahaj-header__cart-count">
                  {cartCount}
                </span>
              )}
            </a>
          </div>
        </div>
        <div className="wahaj-header__accent" />
      </header>

      {/* القائمة الجانبية للموبايل */}
      {menu && (
        <div
          className="fixed inset-0 z-50 bg-black/40"
          onClick={() => setMenu(false)}
        >
          <aside
            className="h-full w-[82%] bg-[var(--bg)] p-6 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xl font-semibold">وَهَج</span>
              <button
                type="button"
                onClick={() => setMenu(false)}
                aria-label="إغلاق القائمة"
              >
                <X />
              </button>
            </div>

            <div className="mt-10 grid gap-5 text-lg">
              {headerMenu
                .filter((x: any) => x && x.href && x.label && x.active !== false)
                .map((x: any) => (
                  <a
                    key={`${x.href}-${x.label}`}
                    href={x.href}
                    onClick={() => setMenu(false)}
                    className={pathname === x.href ? 'gold' : ''}
                  >
                    {x.label}
                  </a>
                ))}
              <a href="/account" onClick={() => setMenu(false)}>حسابي</a>
              <a href="/cart" onClick={() => setMenu(false)}>السلة</a>
            </div>
          </aside>
        </div>
      )}

      {/* الفوتر الموحد في نهاية الصفحة تماماً */}
      <footer className="wahaj-footer">
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
              <div className="wahaj-footer__payments">
                {payments.length > 0
                  ? payments.map((payment: any) => (
                    <span
                      key={payment.method}
                      className="payment-icon"
                      title={payment.label || payment.method}
                    >
                      {payment.iconKey || payment.method}
                    </span>
                  ))
                  : <span className="payment-icon">COD</span>
                }
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

      {/* شريط التنقل السفلي للموبايل */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t bg-[var(--bg)]/95 px-2 py-3 backdrop-blur md:hidden hairline">
        <a href="/" className="text-xs">الرئيسية</a>
        <a href="/shop" className="text-xs">المتجر</a>
        <a href="/account" className="text-xs">حسابي</a>
        <a href="/cart" className="relative text-xs">
          السلة
          {cartCount > 0 && (
            <span className="absolute -top-2 -end-3 min-w-4 rounded-full bg-[var(--brand-gold)] px-1 text-center text-[9px] text-black">
              {cartCount}
            </span>
          )}
        </a>
      </nav>

      {/* زر واتساب العائم */}
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="واتساب"
          title="تواصل معنا عبر واتساب"
          className="fixed bottom-20 end-5 z-30 rounded-full bg-[#25D366] p-4 text-white shadow-lg"
        >
          <MessageCircle />
        </a>
      )}
    </>
  );
}
