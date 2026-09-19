'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Menu, X, Search, User, Moon, Sun, ShoppingBag, MessageCircle, Home, Store } from 'lucide-react';

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

      {/* شريط التنقل السفلي للموبايل (تم تعديل ألوان الحالات غير المحددة لتكون واضحة تماماً في الوضع الداكن) */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-[var(--brand-gold)]/30 bg-[var(--bg)] px-3 py-3 md:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
        <a 
          href="/" 
          className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/' ? 'text-[var(--brand-gold)] font-bold' : 'text-zinc-400 hover:text-zinc-100'}`}
        >
          <Home size={20} />
          <span className="text-[10px]">الرئيسية</span>
        </a>

        <a 
          href="/shop" 
          className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/shop' ? 'text-[var(--brand-gold)] font-bold' : 'text-zinc-400 hover:text-zinc-100'}`}
        >
          <Store size={20} />
          <span className="text-[10px]">المتجر</span>
        </a>

        <a 
          href="/account" 
          className={`flex flex-col items-center gap-1 transition-colors ${pathname === '/account' ? 'text-[var(--brand-gold)] font-bold' : 'text-zinc-400 hover:text-zinc-100'}`}
        >
          <User size={20} />
          <span className="text-[10px]">حسابي</span>
        </a>

        <a 
          href="/cart" 
          className={`relative flex flex-col items-center gap-1 transition-colors ${pathname === '/cart' ? 'text-[var(--brand-gold)] font-bold' : 'text-zinc-400 hover:text-zinc-100'}`}
        >
          <div className="relative">
            <ShoppingBag size={20} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -end-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-gold)] text-[9px] font-bold text-black shadow-sm">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px]">السلة</span>
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
