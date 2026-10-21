'use client';

import { useEffect, useRef, useState } from 'react';
import type { AnchorHTMLAttributes } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ArrowLeft, ChevronLeft, CircleHelp, CreditCard, Menu, X, Search, User, Moon, Sun, ShoppingBag, MessageCircle, Home, Store, Truck, Info, Minus, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import StorePopup from '@/components/store/StorePopup';
import SearchDrawer from '@/components/SearchDrawer';
import { useFeatureFlags } from '@/lib/use-feature-flags';

type SettingMap = Record<string, any>;

type SiteLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };

function SiteLink({ href, ...props }: SiteLinkProps) {
  return href.startsWith('/') && !href.startsWith('//')
    ? <Link href={href} prefetch={false} {...props} />
    : <a href={href} {...props} />;
}

function lockBodyScroll() {
  const body = document.body;
  const previousOverflow = body.style.overflow;
  const previousPaddingInlineEnd = body.style.paddingInlineEnd;
  const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
  if (scrollbarWidth > 0) {
    const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingInlineEnd) || 0;
    body.style.paddingInlineEnd = `${currentPadding + scrollbarWidth}px`;
  }
  body.style.overflow = 'hidden';
  return () => {
    body.style.overflow = previousOverflow;
    body.style.paddingInlineEnd = previousPaddingInlineEnd;
  };
}

export default function SiteChrome() {
  const pathname = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const [menu, setMenu] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const menuCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [settings, setSettings] = useState<SettingMap>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [themeSettings, setThemeSettings] = useState<any>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [cartDrawerClosing, setCartDrawerClosing] = useState(false);
  const cartCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [searchDrawerClosing, setSearchDrawerClosing] = useState(false);
  const searchCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const { enabled: featureEnabled } = useFeatureFlags();
  const cartDrawerEnabled = featureEnabled('cart_drawer', false);
  const darkModeEnabled = featureEnabled('dark_mode', true);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuCloseButtonRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLElement>(null);
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const cartCloseButtonRef = useRef<HTMLButtonElement>(null);
  const cartPanelRef = useRef<HTMLElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchCloseButtonRef = useRef<HTMLButtonElement>(null);
  const settingsLoadedRef = useRef(false);
  const settingsRequestRef = useRef(false);
  const themeIsDark = (resolvedTheme || theme) === 'dark';

  const openMenu = () => {
    if (menuCloseTimerRef.current) clearTimeout(menuCloseTimerRef.current);
    menuCloseTimerRef.current = null;
    setMenuClosing(false);
    setMenu(true);
  };

  const closeMenu = () => {
    if (!menu || menuClosing) return;
    setMenuClosing(true);
    menuCloseTimerRef.current = setTimeout(() => {
      setMenu(false);
      setMenuClosing(false);
      menuCloseTimerRef.current = null;
    }, 420);
  };

  const openCartDrawer = () => {
    if (cartCloseTimerRef.current) clearTimeout(cartCloseTimerRef.current);
    cartCloseTimerRef.current = null;
    setCartDrawerClosing(false);
    setCartDrawerOpen(true);
  };

  const closeCartDrawer = () => {
    if (!cartDrawerOpen || cartDrawerClosing) return;
    setCartDrawerClosing(true);
    cartCloseTimerRef.current = setTimeout(() => {
      setCartDrawerOpen(false);
      setCartDrawerClosing(false);
      cartCloseTimerRef.current = null;
    }, 420);
  };

  const openSearchDrawer = () => {
    if (searchCloseTimerRef.current) clearTimeout(searchCloseTimerRef.current);
    searchCloseTimerRef.current = null;
    setSearchDrawerClosing(false);
    setSearchDrawerOpen(true);
  };

  const closeSearchDrawer = () => {
    if (!searchDrawerOpen || searchDrawerClosing) return;
    setSearchDrawerClosing(true);
    searchCloseTimerRef.current = setTimeout(() => {
      setSearchDrawerOpen(false);
      setSearchDrawerClosing(false);
      searchCloseTimerRef.current = null;
    }, 420);
  };

  useEffect(() => () => {
    if (menuCloseTimerRef.current) clearTimeout(menuCloseTimerRef.current);
    if (cartCloseTimerRef.current) clearTimeout(cartCloseTimerRef.current);
    if (searchCloseTimerRef.current) clearTimeout(searchCloseTimerRef.current);
  }, []);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) {
      settingsLoadedRef.current = false;
      return;
    }

    if (!settingsLoadedRef.current && !settingsRequestRef.current) {
      settingsRequestRef.current = true;
      fetch('/api/settings', { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return;
          setSettings(data.settings || {});
          setPayments(Array.isArray(data.payments) ? data.payments : []);
          setThemeSettings(data.theme || null);
          settingsLoadedRef.current = true;
        })
        .catch(() => {})
        .finally(() => { settingsRequestRef.current = false; });
    }

    const sync = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('wahaj_cart') || '[]');
        setCartItems(Array.isArray(cart) ? cart : []);
        setCartCount(cart.reduce((n: any, x: any) => n + Number(x.quantity || 0), 0));
      } catch {
        setCartCount(0);
      }
    };

    sync();
    window.addEventListener('wahaj-cart-change', sync);
    window.addEventListener('storage', sync);

    return () => {
      window.removeEventListener('wahaj-cart-change', sync);
      window.removeEventListener('storage', sync);
    };
  }, [pathname]);

  useEffect(() => {
    if (!menu) return;

    const unlockBodyScroll = lockBodyScroll();
    menuCloseButtonRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
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
      unlockBodyScroll();
      document.removeEventListener('keydown', handleKeyDown);
      menuButtonRef.current?.focus({ preventScroll: true });
    };
  }, [menu]);

  useEffect(() => {
    if (!cartDrawerOpen) return;

    const unlockBodyScroll = lockBodyScroll();
    cartCloseButtonRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCartDrawer();
        return;
      }

      if (event.key !== 'Tab' || !cartPanelRef.current) return;
      const focusable = Array.from(cartPanelRef.current.querySelectorAll<HTMLElement>(
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
      unlockBodyScroll();
      document.removeEventListener('keydown', handleKeyDown);
      cartButtonRef.current?.focus({ preventScroll: true });
    };
  }, [cartDrawerOpen]);

  useEffect(() => {
    if (!searchDrawerOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSearchDrawer();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      searchButtonRef.current?.focus({ preventScroll: true });
    };
  }, [searchDrawerOpen]);

  const saveDrawerCart = (next: any[]) => {
    setCartItems(next);
    setCartCount(next.reduce((count, item) => count + Number(item.quantity || 0), 0));
    try {
      localStorage.setItem('wahaj_cart', JSON.stringify(next));
      window.dispatchEvent(new Event('wahaj-cart-change'));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // Keep the drawer responsive even when browser storage is unavailable.
    }
  };
  const updateDrawerQuantity = (index: number, delta: number) => {
    saveDrawerCart(cartItems.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const maximum = Math.max(1, Number(item.maxStock || 99));
      return { ...item, quantity: Math.max(1, Math.min(maximum, Number(item.quantity || 1) + delta)) };
    }));
  };
  const drawerSubtotal = cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const drawerQuantity = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const drawerFreeShipping = Number(settings.free_shipping || 0);
  const drawerShippingProgress = drawerFreeShipping > 0 ? Math.min(100, drawerSubtotal / drawerFreeShipping * 100) : 0;
  const drawerRemaining = Math.max(0, drawerFreeShipping - drawerSubtotal);
  const drawerMoney = (amount: number) => `${amount.toLocaleString('ar-EG')} ج.م`;

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
  const popupExcludedRoutes = [
    '/cart',
    '/account',
    '/contact',
    '/faq',
    '/policies/shipping',
    '/policies/returns',
    '/policies/privacy',
    '/policies/terms',
    '/payment-policy',
    '/about',
    '/track-order',
  ];
  const popupExcluded = popupExcludedRoutes.some(route => pathname === route || pathname?.startsWith(`${route}/`));
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
        <div className="wahaj-announcement-bar" role="note" aria-label="إعلان المتجر">
          <span>{settings.announcement}</span>
        </div>
      )}

      {/* الهيدر العلوي الاحترافي */}
      <header className="wahaj-header wahaj-header--luxury sticky top-0 z-40 border-b border-(--gold)/20 bg-(--bg)/95 backdrop-blur-md">
        <div className="container wahaj-header__inner flex items-center justify-between py-3.5 px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              ref={menuButtonRef}
              className="wahaj-header__menu md:hidden text-foreground hover:text-(--gold) transition-colors"
              onClick={openMenu}
              aria-label="فتح القائمة"
              aria-haspopup="dialog"
              aria-expanded={menu}
              aria-controls="wahaj-mobile-drawer"
            >
              <Menu size={22} />
            </button>

            <SiteLink
              href="/"
              className="wahaj-header__logo flex flex-col items-start"
              aria-label="وَهَج - الصفحة الرئيسية"
            >
              <span className="font-bold text-lg tracking-wider text-foreground">{settings.brand_name || 'وَهَج'}</span>
              <small className="text-[9px] tracking-widest text-(--gold)">Wahaj Store</small>
            </SiteLink>
          </div>

          <nav
            className="wahaj-header__nav hidden md:flex items-center gap-6 text-sm font-medium"
            aria-label="القائمة الرئيسية"
          >
            {headerMenu
              .filter((x: any) => x && x.href && x.label && x.active !== false)
              .map((x: any) => (
                <SiteLink
                  key={`${x.href}-${x.label}`}
                  href={x.href}
                  aria-current={isRouteActive(x.href) ? 'page' : undefined}
                  className={`transition-colors hover:text-(--gold) ${isRouteActive(x.href) ? 'text-(--gold) font-bold border-b-2 border-(--gold) pb-0.5' : 'text-foreground/80'}`}
                >
                  {x.label}
                </SiteLink>
              ))}
          </nav>

          {/* الأيقونات العلوية النظيفة والمرتبة */}
          <div className="wahaj-header__actions flex items-center gap-4">
            <button
              type="button"
              ref={searchButtonRef}
              onClick={openSearchDrawer}
              className="wahaj-header__action text-foreground/80 hover:text-(--gold) transition-colors p-1"
              aria-label="المتجر والبحث عن المنتجات"
              title="المتجر والبحث عن المنتجات"
              aria-haspopup="dialog"
              aria-expanded={searchDrawerOpen}
              aria-controls="wahaj-search-drawer"
            >
              <Search size={20} />
            </button>

            <SiteLink
              href="/account"
              className="wahaj-header__action text-foreground/80 hover:text-(--gold) transition-colors p-1"
              aria-label="حسابي"
              title="حسابي"
            >
              <User size={20} />
            </SiteLink>

            {darkModeEnabled && <button
              type="button"
              onClick={() => setTheme(themeIsDark ? 'light' : 'dark')}
              className="wahaj-header__action text-foreground/80 hover:text-(--gold) transition-colors p-1"
              aria-label="تبديل الوضع"
              title={themeIsDark ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {themeIsDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>}

            {cartDrawerEnabled ? (
              <button
                type="button"
                ref={cartButtonRef}
                onClick={openCartDrawer}
                className="wahaj-header__action wahaj-header__cart relative text-foreground/80 hover:text-(--gold) transition-colors p-1"
                aria-label={`فتح السلة الجانبية (${cartCount})`}
                title="السلة"
              >
                <ShoppingBag size={20} />
                {cartCount > 0 && <span className="absolute -top-1.5 -inset-e-2 flex h-4 w-4 items-center justify-center rounded-full bg-(--gold) text-[9px] font-bold text-(--gold-contrast) shadow-xs">{cartCount}</span>}
              </button>
            ) : <SiteLink href="/cart" className="wahaj-header__action wahaj-header__cart relative text-foreground/80 hover:text-(--gold) transition-colors p-1" aria-label="السلة" title="السلة">
              <ShoppingBag size={20} />
              {cartCount > 0 && <span className="absolute -top-1.5 -inset-e-2 flex h-4 w-4 items-center justify-center rounded-full bg-(--gold) text-[9px] font-bold text-(--gold-contrast) shadow-xs">{cartCount}</span>}
            </SiteLink>}
          </div>
        </div>
        <div className="wahaj-header__accent h-px bg-linear-to-r from-transparent via-(--gold)/40 to-transparent" />
      </header>

      {/* القائمة الجانبية للموبايل */}
      {menu && (
        <div
          className={`wahaj-drawer-overlay${menuClosing ? ' is-closing' : ''}`}
          onMouseDown={() => closeMenu()}
          role="presentation"
        >
          <aside
            id="wahaj-mobile-drawer"
            ref={menuPanelRef}
            className={`wahaj-mobile-drawer${menuClosing ? ' is-closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="قائمة التنقل الرئيسية"
            dir="rtl"
            onMouseDown={event => event.stopPropagation()}
          >
            <div className="wahaj-mobile-drawer__scroll">
              <div className="wahaj-mobile-drawer__top">
                <SiteLink href="/" className="wahaj-mobile-drawer__brand" onClick={() => closeMenu()} aria-label="وَهَج — الصفحة الرئيسية">
                  <span className="wahaj-mobile-drawer__brand-mark"><ShoppingBag size={21} strokeWidth={1.7} /></span>
                  <span className="wahaj-mobile-drawer__brand-copy">
                    <b>{settings.brand_name || 'وَهَج'}</b>
                    <small>WAHAJ STORE</small>
                  </span>
                </SiteLink>
                <button
                  type="button"
                  ref={menuCloseButtonRef}
                  onClick={() => closeMenu()}
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
                <SiteLink href="/shop" onClick={() => closeMenu()} className="wahaj-mobile-drawer__shop-link">
                  اكتشفي المتجر <ArrowLeft size={14} />
                </SiteLink>
              </div>

              <nav className="wahaj-mobile-drawer__nav" aria-label="روابط المتجر">
                <p className="wahaj-mobile-drawer__section-label">تصفّحي المتجر</p>
                <div className="wahaj-mobile-drawer__links">
                  {headerMenu.map((item: any, index: number) => {
                    const active = isRouteActive(item.href);
                    return (
                      <SiteLink
                        key={`${item.href}-${item.label}-${index}`}
                        href={item.href}
                        onClick={() => closeMenu()}
                        aria-current={active ? 'page' : undefined}
                        className={`wahaj-mobile-drawer__link${active ? ' is-active' : ''}`}
                      >
                        <span className="wahaj-mobile-drawer__link-icon">{getMenuIcon(item.href)}</span>
                        <span className="wahaj-mobile-drawer__link-label">{item.label}</span>
                        {active && <span className="wahaj-mobile-drawer__active-dot" aria-hidden="true" />}
                        {!active && <ChevronLeft size={15} className="wahaj-mobile-drawer__chevron" aria-hidden="true" />}
                      </SiteLink>
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
                          <SiteLink
                            key={item.href}
                            href={item.href}
                            onClick={() => closeMenu()}
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
                          </SiteLink>
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
                <SiteLink href="/contact" onClick={() => closeMenu()} className="wahaj-mobile-drawer__support">
                  <MessageCircle size={16} /> المساعدة
                </SiteLink>
              </div>
              <p className="wahaj-mobile-drawer__copyright">جميع الحقوق محفوظة لمتجر {settings.brand_name || 'وَهَج'} © {new Date().getFullYear()}</p>
            </div>
          </aside>
        </div>
      )}

      {cartDrawerOpen && (
        <div className={`wahaj-cart-drawer-overlay${cartDrawerClosing ? ' is-closing' : ''}`} role="presentation" onMouseDown={closeCartDrawer}>
          <aside
            ref={cartPanelRef}
            className={`wahaj-cart-drawer${cartDrawerClosing ? ' is-closing' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="wahaj-cart-drawer-title"
            dir="rtl"
            onMouseDown={event => event.stopPropagation()}
          >
            <header className="wahaj-cart-drawer__header">
              <div className="wahaj-cart-drawer__heading">
                <span className="wahaj-cart-drawer__brand"><ShoppingBag size={16} /> وَهَج</span>
                <h2 id="wahaj-cart-drawer-title">سلة مشترياتكِ</h2>
                <p>{drawerQuantity ? `${drawerQuantity} ${drawerQuantity === 1 ? 'قطعة مختارة' : 'قطع مختارة'}` : 'اختياراتكِ المفضّلة في مكان واحد'}</p>
              </div>
              <button
                type="button"
                ref={cartCloseButtonRef}
                onClick={() => closeCartDrawer()}
                aria-label="إغلاق السلة"
                className="wahaj-cart-drawer__close"
              ><X size={19} /></button>
            </header>

            <div className="wahaj-cart-drawer__body">
              {cartItems.length === 0 ? (
                <div className="wahaj-cart-drawer__empty">
                  <span className="wahaj-cart-drawer__empty-icon"><ShoppingBag size={27} strokeWidth={1.6} /></span>
                  <h3>سلتكِ فارغة حاليًا</h3>
                  <p>ابدئي باكتشاف القطع التي اخترناها لكِ، وستجدينها هنا عند إضافتها.</p>
                  <SiteLink href="/shop" onClick={() => closeCartDrawer()} className="wahaj-cart-drawer__shop-link">اكتشفي المتجر <ArrowLeft size={15} /></SiteLink>
                </div>
              ) : (
                <>
                  {drawerFreeShipping > 0 && (
                    <section className="wahaj-cart-drawer__shipping" aria-label="تقدم الشحن المجاني">
                      <div><Truck size={16} /><span>{drawerRemaining ? `أضيفي منتجات بقيمة ${drawerMoney(drawerRemaining)} للشحن المجاني` : 'رائع! أصبح شحن طلبكِ مجانيًا'}</span></div>
                      <div className="wahaj-cart-drawer__progress" role="progressbar" aria-valuenow={Math.round(drawerShippingProgress)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${drawerShippingProgress}%` }} /></div>
                    </section>
                  )}
                  <div className="wahaj-cart-drawer__items-label"><span>اختياراتكِ</span><b>{drawerQuantity} {drawerQuantity === 1 ? 'قطعة' : 'قطع'}</b></div>
                  <ul className="wahaj-cart-drawer__items">
                    {cartItems.map((item: any, index: number) => (
                      <li key={`${item.productId}:${item.variantId || index}`} className="wahaj-cart-drawer__item">
                        <div className="wahaj-cart-drawer__image">
                          <img src={item.image || '/placeholder.svg'} alt={item.name || 'منتج من متجر وَهَج'} />
                        </div>
                        <div className="wahaj-cart-drawer__item-body">
                          <div className="wahaj-cart-drawer__item-top">
                            <div className="wahaj-cart-drawer__item-copy">
                              <h3>{item.name}</h3>
                              {item.variantValue && <p>{item.variantName || 'الخيار'}: {item.variantValue}</p>}
                              <span>{drawerMoney(Number(item.price || 0))}</span>
                            </div>
                            <button type="button" className="wahaj-cart-drawer__remove" onClick={() => saveDrawerCart(cartItems.filter((_, itemIndex) => itemIndex !== index))} aria-label={`حذف ${item.name} من السلة`} title="حذف المنتج"><Trash2 size={16} /></button>
                          </div>
                          <div className="wahaj-cart-drawer__item-bottom">
                            <div className="wahaj-cart-drawer__quantity" aria-label={`كمية ${item.name}`}>
                              <button type="button" onClick={() => updateDrawerQuantity(index, -1)} aria-label={`تقليل كمية ${item.name}`} disabled={Number(item.quantity || 1) <= 1}><Minus size={13} /></button>
                              <span aria-live="polite">{item.quantity || 1}</span>
                              <button type="button" onClick={() => updateDrawerQuantity(index, 1)} aria-label={`زيادة كمية ${item.name}`} disabled={Boolean(item.maxStock && item.quantity >= item.maxStock)}><Plus size={13} /></button>
                            </div>
                            <strong>{drawerMoney(Number(item.price || 0) * Number(item.quantity || 0))}</strong>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            {cartItems.length > 0 && (
              <footer className="wahaj-cart-drawer__footer">
                <div className="wahaj-cart-drawer__subtotal"><span>الإجمالي المبدئي</span><strong>{drawerMoney(drawerSubtotal)}</strong></div>
                <p className="wahaj-cart-drawer__note"><ShieldCheck size={14} /> يتم احتساب الشحن والسعر النهائي عند مراجعة الطلب</p>
                <SiteLink href="/checkout" onClick={() => closeCartDrawer()} className="wahaj-cart-drawer__checkout">إتمام الطلب <ArrowLeft size={16} /></SiteLink>
                <SiteLink href="/cart" onClick={() => closeCartDrawer()} className="wahaj-cart-drawer__review">مراجعة السلة كاملة</SiteLink>
              </footer>
            )}
          </aside>
        </div>
      )}

      <nav className="wahaj-mobile-bottom-nav" aria-label="التنقل السريع">
        <SiteLink href="/" className={pathname === '/' ? 'is-active' : ''} aria-label="الرئيسية" aria-current={pathname === '/' ? 'page' : undefined}>
          <Home size={18} /><span>الرئيسية</span>
        </SiteLink>
        <SiteLink href="/shop" className={pathname?.startsWith('/shop') ? 'is-active' : ''} aria-label="المتجر" aria-current={pathname?.startsWith('/shop') ? 'page' : undefined}>
          <Store size={18} /><span>المتجر</span>
        </SiteLink>
        <SiteLink href="/cart" className={pathname?.startsWith('/cart') ? 'is-active wahaj-mobile-bottom-nav__cart' : 'wahaj-mobile-bottom-nav__cart'} aria-label="السلة" aria-current={pathname?.startsWith('/cart') ? 'page' : undefined}>
          <ShoppingBag size={18} /><span>السلة</span>
          {cartCount > 0 && <b>{cartCount > 99 ? '99+' : cartCount}</b>}
        </SiteLink>
        <SiteLink href="/account" className={pathname?.startsWith('/account') ? 'is-active' : ''} aria-label="حسابي" aria-current={pathname?.startsWith('/account') ? 'page' : undefined}>
          <User size={18} /><span>حسابي</span>
        </SiteLink>
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
      <SearchDrawer
        open={searchDrawerOpen}
        onClose={closeSearchDrawer}
        closing={searchDrawerClosing}
        closeButtonRef={searchCloseButtonRef}
      />
      {!popupExcluded && <StorePopup enabled={settings.popup_enabled} config={settings.popup_config} visitKey={pathname || '/'} />}
    </>
  );
}
