'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Menu, X, Search, User, Moon, Sun, ShoppingBag, MessageCircle, Home, Store, Truck, Info } from 'lucide-react';

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

  // دالة لتحديد الأيقونة المناسبة حسب الرابط أو النص
  const getMenuIcon = (href: string) => {
    if (href === '/') return <Home size={18} />;
    if (href === '/shop') return <Store size={18} />;
    if (href === '/about') return <Info size={18} />;
    return <Store size={18} />;
  };

  return (
    <>
      {/* إعلان المتجر العلوي */}
      {settings.announcement && (
        <div className="bg-[#241B1A] py-2 text-center text-xs text-[#F7F2EA] tracking-wider">
          {settings.announcement}
        </div>
      )}

      {/* الهيدر العلوي الاحترافي */}
      <header className="wahaj-header wahaj-header--luxury sticky top-0 z-40 border-b border-[var(--gold)]/20 bg-[var(--bg)]/95 backdrop-blur-md">
        <div className="container wahaj-header__inner flex items-center justify-between py-3.5 px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="wahaj-header__menu md:hidden text-foreground hover:text-[var(--gold)] transition-colors"
              onClick={() => setMenu(true)}
              aria-label="فتح القائمة"
            >
              <Menu size={22} />
            </button>

            <a
              href="/"
              className="wahaj-header__logo flex flex-col items-start"
              aria-label="وَهَج - الصفحة الرئيسية"
            >
              <span className="font-bold text-lg tracking-wider text-foreground">{settings.brand_name || 'وَهَج'}</span>
              <small className="text-[9px] tracking-widest text-[var(--gold)]">Wahaj Store</small>
            </a>
          </div>

          <nav
            className="wahaj-header__nav hidden md:flex items-center gap-6 text-sm font-medium"
            aria-label="القائمة الرئيسية"
          >
            {headerMenu
              .filter((x: any) => x && x.href && x.label && x.active !== false)
              .map((x: any) => (
                <a
                  key={`${x.href}-${x.label}`}
                  href={x.href}
                  className={`transition-colors hover:text-[var(--gold)] ${pathname === x.href ? 'text-[var(--gold)] font-bold border-b-2 border-[var(--gold)] pb-0.5' : 'text-foreground/80'}`}
                >
                  {x.label}
                </a>
              ))}
          </nav>

          {/* الأيقونات العلوية النظيفة والمرتبة */}
          <div className="wahaj-header__actions flex items-center gap-4">
            <a
              href="/shop"
              className="wahaj-header__action text-foreground/80 hover:text-[var(--gold)] transition-colors p-1"
              aria-label="البحث"
              title="البحث"
            >
              <Search size={20} />
            </a>

            <a
              href="/account"
              className="wahaj-header__action text-foreground/80 hover:text-[var(--gold)] transition-colors p-1"
              aria-label="حسابي"
              title="حسابي"
            >
              <User size={20} />
            </a>

            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="wahaj-header__action text-foreground/80 hover:text-[var(--gold)] transition-colors p-1"
              aria-label="تبديل الوضع"
              title={theme === 'dark' ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <a
              href="/cart"
              className="wahaj-header__action wahaj-header__cart relative text-foreground/80 hover:text-[var(--gold)] transition-colors p-1"
              aria-label="السلة"
              title="السلة"
            >
              <ShoppingBag size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -end-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--gold)] text-[9px] font-bold text-[var(--gold-contrast)] shadow-sm">
                  {cartCount}
                </span>
              )}
            </a>
          </div>
        </div>
        <div className="wahaj-header__accent h-[1px] bg-gradient-to-r from-transparent via-[var(--gold)]/40 to-transparent" />
      </header>

      {/* القائمة الجانبية للموبايل */}
      {menu && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMenu(false)}
        >
          <aside
            className="h-full w-[82%] bg-[var(--bg)] p-6 shadow-2xl border-e border-[var(--gold)]/20 flex flex-col justify-between"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-border/40">
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-wider">وَهَج</span>
                  <span className="text-[10px] text-[var(--gold)] tracking-widest">Wahaj Store</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMenu(false)}
                  aria-label="إغلاق القائمة"
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-6 grid gap-3 text-base font-medium">
                {headerMenu
                  .filter((x: any) => x && x.href && x.label && x.active !== false)
                  .map((x: any) => (
                    <a
                      key={`${x.href}-${x.label}`}
                      href={x.href}
                      onClick={() => setMenu(false)}
                      className={`py-2.5 px-3 rounded-xl transition-all flex items-center gap-3 ${pathname === x.href ? 'bg-[var(--gold)]/15 text-[var(--gold)] font-bold border-s-4 border-[var(--gold)]' : 'hover:bg-muted/50 text-foreground/90'}`}
                    >
                      {getMenuIcon(x.href)}
                      <span>{x.label}</span>
                    </a>
                  ))}

                <a 
                  href="/track-order" 
                  onClick={() => setMenu(false)} 
                  className={`py-2.5 px-3 rounded-xl transition-all flex items-center gap-3 ${pathname === '/track-order' ? 'bg-[var(--gold)]/15 text-[var(--gold)] font-bold border-s-4 border-[var(--gold)]' : 'hover:bg-muted/50 text-foreground/90'}`}
                >
                  <Truck size={18} />
                  <span>تتبع الطلب</span>
                </a>

                <a 
                  href="/account" 
                  onClick={() => setMenu(false)} 
                  className={`py-2.5 px-3 rounded-xl transition-all flex items-center gap-3 ${pathname === '/account' ? 'bg-[var(--gold)]/15 text-[var(--gold)] font-bold border-s-4 border-[var(--gold)]' : 'hover:bg-muted/50 text-foreground/90'}`}
                >
                  <User size={18} />
                  <span>حسابي</span>
                </a>

                <a 
                  href="/cart" 
                  onClick={() => setMenu(false)} 
                  className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-between ${pathname === '/cart' ? 'bg-[var(--gold)]/15 text-[var(--gold)] font-bold border-s-4 border-[var(--gold)]' : 'hover:bg-muted/50 text-foreground/90'}`}
                >
                  <div className="flex items-center gap-3">
                    <ShoppingBag size={18} />
                    <span>السلة</span>
                  </div>
                  {cartCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[var(--gold)] text-[10px] font-bold text-[var(--gold-contrast)]">
                      {cartCount}
                    </span>
                  )}
                </a>
              </div>
            </div>

            <div className="text-center text-xs text-muted-foreground pb-4">
              جميع الحقوق محفوظة لمتجر وَهَج © 2026
            </div>
          </aside>
        </div>
      )}

      {/* شريط التنقل السفلي — Mobile Luxury Navigation */}
      <nav
        className="wahaj-mobile-bottom-nav md:hidden"
        aria-label="التنقل الرئيسي للموبايل"
      >
        <div className="wahaj-mobile-bottom-nav__inner">
          <a
            href="/"
            className={`wahaj-mobile-bottom-nav__item ${pathname === '/' ? 'is-active' : ''}`}
            aria-current={pathname === '/' ? 'page' : undefined}
          >
            <span className="wahaj-mobile-bottom-nav__icon"><Home size={19} strokeWidth={pathname === '/' ? 2.3 : 1.8} /></span>
            <span className="wahaj-mobile-bottom-nav__label">الرئيسية</span>
          </a>

          <a
            href="/shop"
            className={`wahaj-mobile-bottom-nav__item ${pathname === '/shop' ? 'is-active' : ''}`}
            aria-current={pathname === '/shop' ? 'page' : undefined}
          >
            <span className="wahaj-mobile-bottom-nav__icon"><Store size={19} strokeWidth={pathname === '/shop' ? 2.3 : 1.8} /></span>
            <span className="wahaj-mobile-bottom-nav__label">المتجر</span>
          </a>

          <a
            href="/cart"
            className={`wahaj-mobile-bottom-nav__item wahaj-mobile-bottom-nav__item--cart ${pathname === '/cart' ? 'is-active' : ''}`}
            aria-current={pathname === '/cart' ? 'page' : undefined}
          >
            <span className="wahaj-mobile-bottom-nav__cart-orb">
              <ShoppingBag size={20} strokeWidth={pathname === '/cart' ? 2.4 : 1.9} />
              {cartCount > 0 && (
                <span className="wahaj-mobile-bottom-nav__badge">{cartCount > 99 ? '99+' : cartCount}</span>
              )}
            </span>
            <span className="wahaj-mobile-bottom-nav__label">السلة</span>
          </a>

          <a
            href="/account"
            className={`wahaj-mobile-bottom-nav__item ${pathname === '/account' ? 'is-active' : ''}`}
            aria-current={pathname === '/account' ? 'page' : undefined}
          >
            <span className="wahaj-mobile-bottom-nav__icon"><User size={19} strokeWidth={pathname === '/account' ? 2.3 : 1.8} /></span>
            <span className="wahaj-mobile-bottom-nav__label">حسابي</span>
          </a>
        </div>
      </nav>

      {/* زر واتساب العائم (مفعل ودائم الظهور) */}
      <a
        href="https://wa.me/2010xxxxxxxx"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="واتساب"
        title="تواصل معنا عبر واتساب"
        className="wahaj-mobile-whatsapp fixed end-5 z-30 rounded-full bg-[#25D366] p-3.5 text-white shadow-xl hover:scale-105 transition-transform flex items-center justify-center"
      >
        <MessageCircle size={24} />
      </a>
    </>
  );
}
