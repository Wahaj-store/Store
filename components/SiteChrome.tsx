'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ArrowLeft, ChevronLeft, CircleHelp, CreditCard, Menu, X, Search, User, Moon, Sun, ShoppingBag, MessageCircle, Home, Store, Truck, Info } from 'lucide-react';

type SettingMap = Record<string, any>;

export default function SiteChrome() {
  const pathname = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const [menu, setMenu] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [settings, setSettings] = useState<SettingMap>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [themeSettings, setThemeSettings] = useState<any>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLElement>(null);
  const themeIsDark = (resolvedTheme || theme) === 'dark';

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
    if (!menu) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    menuCloseButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenu(false);
        return;
      }

      if (event.key !== 'Tab' || !menuPanelRef.current) return;
      const focusable = Array.from(menuPanelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      menuButtonRef.current?.focus();
    };
  }, [menu]);

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

  const defaultHeaderMenu = [
    { label: 'الرئيسية', href: '/' },
    { label: 'المتجر', href: '/shop' },
    { label: 'من نحن', href: '/about' },
  ];
  const parsedHeaderMenu = parse(
    settings.header_menu,
    defaultHeaderMenu,
  );
  const headerMenu = Array.isArray(parsedHeaderMenu)
    ? parsedHeaderMenu.filter((item: any) => item && typeof item.href === 'string' && typeof item.label === 'string' && item.active !== false)
    : defaultHeaderMenu;

  const getMenuIcon = (href: string) => {
    const iconProps = { size: 19, strokeWidth: 1.8 };
    if (href === '/') return <Home {...iconProps} />;
    if (href === '/shop') return <Store {...iconProps} />;
    if (href === '/about') return <Info {...iconProps} />;
    if (href === '/track-order') return <Truck {...iconProps} />;
    if (href === '/account') return <User {...iconProps} />;
    if (href === '/cart') return <ShoppingBag {...iconProps} />;
    if (href === '/faq' || href === '/contact') return <CircleHelp {...iconProps} />;
    if (href === '/payment-policy') return <CreditCard {...iconProps} />;
    return <Store {...iconProps} />;
  };
  const isRouteActive = (href: string) => pathname === href || (href !== '/' && !!pathname?.startsWith(`${href}/`));
  const utilityLinks = [
    { label: 'تتبع الطلب', href: '/track-order' },
    { label: 'حسابي', href: '/account' },
    { label: 'السلة', href: '/cart' },
  ].filter(item => !headerMenu.some((configured: any) => configured.href === item.href));
  const rawWhatsappDigits = String(settings.whatsapp || '').replace(/\D/g, '').replace(/^00/, '');
  const configuredWhatsapp = rawWhatsappDigits.length === 11 && rawWhatsappDigits.startsWith('01')
    ? `20${rawWhatsappDigits.slice(1)}`
    : rawWhatsappDigits.length === 10 && rawWhatsappDigits.startsWith('1')
      ? `20${rawWhatsappDigits}`
      : rawWhatsappDigits;
  const whatsappHref = configuredWhatsapp.length >= 8
    ? `https://wa.me/${configuredWhatsapp}`
    : '/contact';
  const whatsappHasNumber = configuredWhatsapp.length >= 8;

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
              ref={menuButtonRef}
              className="wahaj-header__menu md:hidden text-foreground hover:text-[var(--gold)] transition-colors"
              onClick={() => setMenu(true)}
              aria-label="فتح القائمة"
              aria-haspopup="dialog"
              aria-expanded={menu}
              aria-controls="wahaj-mobile-drawer"
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
          className="wahaj-drawer-overlay"
          onMouseDown={() => setMenu(false)}
          role="presentation"
        >
          <aside
            id="wahaj-mobile-drawer"
            ref={menuPanelRef}
            className="wahaj-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="قائمة التنقل الرئيسية"
            dir="rtl"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="wahaj-mobile-drawer__scroll">
              <div className="wahaj-mobile-drawer__top">
                <a href="/" className="wahaj-mobile-drawer__brand" onClick={() => setMenu(false)} aria-label="وَهَج — الصفحة الرئيسية">
                  <span className="wahaj-mobile-drawer__brand-mark"><ShoppingBag size={21} strokeWidth={1.7} /></span>
                  <span className="wahaj-mobile-drawer__brand-copy">
                    <b>{settings.brand_name || 'وَهَج'}</b>
                    <small>WAHAJ STORE</small>
                  </span>
                </a>
                <button
                  type="button"
                  ref={menuCloseButtonRef}
                  onClick={() => setMenu(false)}
                  aria-label="إغلاق القائمة"
                  className="wahaj-mobile-drawer__close"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="wahaj-mobile-drawer__welcome">
                <span className="wahaj-mobile-drawer__eyebrow">اكتشفي وَهَج</span>
                <h2>كل ما تحبينه، أقرب إليكِ</h2>
                <p>تصفّحي المتجر وتابعي طلباتك بسهولة.</p>
                <a href="/shop" onClick={() => setMenu(false)} className="wahaj-mobile-drawer__shop-link">
                  اكتشفي المتجر <ArrowLeft size={14} />
                </a>
              </div>

              <nav className="wahaj-mobile-drawer__nav" aria-label="روابط المتجر">
                <p className="wahaj-mobile-drawer__section-label">تصفّحي المتجر</p>
                <div className="wahaj-mobile-drawer__links">
                  {headerMenu.map((item: any, index: number) => {
                    const active = isRouteActive(item.href);
                    return (
                      <a
                        key={`${item.href}-${item.label}-${index}`}
                        href={item.href}
                        onClick={() => setMenu(false)}
                        aria-current={active ? 'page' : undefined}
                        className={`wahaj-mobile-drawer__link${active ? ' is-active' : ''}`}
                      >
                        <span className="wahaj-mobile-drawer__link-icon">{getMenuIcon(item.href)}</span>
                        <span className="wahaj-mobile-drawer__link-label">{item.label}</span>
                        {active && <span className="wahaj-mobile-drawer__active-dot" aria-hidden="true" />}
                        {!active && <ChevronLeft size={15} className="wahaj-mobile-drawer__chevron" aria-hidden="true" />}
                      </a>
                    );
                  })}
                </div>

                {utilityLinks.length > 0 && (
                  <>
                    <p className="wahaj-mobile-drawer__section-label wahaj-mobile-drawer__section-label--secondary">خدماتك</p>
                    <div className="wahaj-mobile-drawer__links">
                      {utilityLinks.map(item => {
                        const active = isRouteActive(item.href);
                        return (
                          <a
                            key={item.href}
                            href={item.href}
                            onClick={() => setMenu(false)}
                            aria-current={active ? 'page' : undefined}
                            className={`wahaj-mobile-drawer__link${active ? ' is-active' : ''}`}
                          >
                            <span className="wahaj-mobile-drawer__link-icon">{getMenuIcon(item.href)}</span>
                            <span className="wahaj-mobile-drawer__link-label">{item.label}</span>
                            {item.href === '/cart' && cartCount > 0 && (
                              <span className="wahaj-mobile-drawer__cart-count">{cartCount > 99 ? '99+' : cartCount}</span>
                            )}
                            {active && <span className="wahaj-mobile-drawer__active-dot" aria-hidden="true" />}
                            {!active && item.href !== '/cart' && <ChevronLeft size={15} className="wahaj-mobile-drawer__chevron" aria-hidden="true" />}
                          </a>
                        );
                      })}
                    </div>
                  </>
                )}
              </nav>
            </div>

            <div className="wahaj-mobile-drawer__footer">
              <div className="wahaj-mobile-drawer__footer-actions">
                <button
                  type="button"
                  className="wahaj-mobile-drawer__theme"
                  onClick={() => setTheme(themeIsDark ? 'light' : 'dark')}
                  aria-label={themeIsDark ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
                >
                  <span className="wahaj-mobile-drawer__footer-icon">
                    {themeIsDark ? <Sun size={17} /> : <Moon size={17} />}
                  </span>
                  <span>{themeIsDark ? 'الوضع النهاري' : 'الوضع الليلي'}</span>
                </button>
                <a href="/contact" onClick={() => setMenu(false)} className="wahaj-mobile-drawer__support">
                  <MessageCircle size={16} /> المساعدة
                </a>
              </div>
              <p className="wahaj-mobile-drawer__copyright">جميع الحقوق محفوظة لمتجر {settings.brand_name || 'وَهَج'} © {new Date().getFullYear()}</p>
            </div>
          </aside>
        </div>
      )}

      {/* شريط التنقل السفلي — Mobile Luxury Navigation */}
      <nav
        className={`wahaj-mobile-bottom-nav${menu ? ' is-menu-open' : ''}`}
        aria-label="التنقل الرئيسي للموبايل"
      >
        <div className="wahaj-mobile-bottom-nav__inner">
          <a
            href="/"
            className={`wahaj-mobile-bottom-nav__item ${isRouteActive('/') ? 'is-active' : ''}`}
            aria-current={pathname === '/' ? 'page' : undefined}
            title="الرئيسية"
          >
            <span className="wahaj-mobile-bottom-nav__icon"><Home size={19} strokeWidth={isRouteActive('/') ? 2.3 : 1.8} /></span>
            <span className="wahaj-mobile-bottom-nav__label">الرئيسية</span>
          </a>

          <a
            href="/shop"
            className={`wahaj-mobile-bottom-nav__item ${isRouteActive('/shop') ? 'is-active' : ''}`}
            aria-current={isRouteActive('/shop') ? 'page' : undefined}
            title="المتجر"
          >
            <span className="wahaj-mobile-bottom-nav__icon"><Store size={19} strokeWidth={isRouteActive('/shop') ? 2.3 : 1.8} /></span>
            <span className="wahaj-mobile-bottom-nav__label">المتجر</span>
          </a>

          <a
            href="/cart"
            className={`wahaj-mobile-bottom-nav__item wahaj-mobile-bottom-nav__item--cart ${isRouteActive('/cart') ? 'is-active' : ''}`}
            aria-current={isRouteActive('/cart') ? 'page' : undefined}
            title={cartCount > 0 ? `السلة، ${cartCount} منتج` : 'السلة'}
          >
            <span className="wahaj-mobile-bottom-nav__cart-orb">
              <ShoppingBag size={20} strokeWidth={isRouteActive('/cart') ? 2.4 : 1.9} />
              {cartCount > 0 && (
                <span className="wahaj-mobile-bottom-nav__badge" aria-label={`${cartCount} منتج في السلة`}>{cartCount > 99 ? '99+' : cartCount}</span>
              )}
            </span>
            <span className="wahaj-mobile-bottom-nav__label">السلة</span>
          </a>

          <a
            href="/account"
            className={`wahaj-mobile-bottom-nav__item ${isRouteActive('/account') ? 'is-active' : ''}`}
            aria-current={isRouteActive('/account') ? 'page' : undefined}
            title="حسابي"
          >
            <span className="wahaj-mobile-bottom-nav__icon"><User size={19} strokeWidth={isRouteActive('/account') ? 2.3 : 1.8} /></span>
            <span className="wahaj-mobile-bottom-nav__label">حسابي</span>
          </a>
        </div>
      </nav>

      {/* زر التواصل العائم — يستخدم رقم واتساب المُدار من إعدادات المتجر العامة */}
      <a
        href={whatsappHref}
        target={whatsappHasNumber ? '_blank' : undefined}
        rel={whatsappHasNumber ? 'noopener noreferrer' : undefined}
        aria-label={whatsappHasNumber ? 'تواصل معنا عبر واتساب' : 'تواصل مع خدمة العملاء'}
        title={whatsappHasNumber ? 'تواصل معنا عبر واتساب' : 'تواصل مع خدمة العملاء'}
        className="wahaj-mobile-whatsapp"
      >
        <span className="wahaj-mobile-whatsapp__icon"><MessageCircle size={20} strokeWidth={2} /></span>
        <span className="wahaj-mobile-whatsapp__copy">
          <b>{whatsappHasNumber ? 'تواصلي معنا' : 'نحن هنا لمساعدتك'}</b>
          <small>{whatsappHasNumber ? 'عبر واتساب' : 'خدمة العملاء'}</small>
        </span>
        <span className="wahaj-mobile-whatsapp__online" aria-hidden="true" />
      </a>
    </>
  );
}
