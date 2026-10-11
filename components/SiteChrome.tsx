'use client';

import { useEffect, useRef, useState } from 'react';
import type { AnchorHTMLAttributes } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ArrowLeft, ChevronLeft, CircleHelp, CreditCard, Menu, X, Search, User, Moon, Sun, ShoppingBag, MessageCircle, Home, Store, Truck, Info, Minus, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import StorePopup from '@/components/store/StorePopup';
import { useFeatureFlags } from '@/lib/use-feature-flags';

type SettingMap = Record<string, any>;

type SiteLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };

function SiteLink({ href, ...props }: SiteLinkProps) {
  return href.startsWith('/') && !href.startsWith('//')
    ? <Link href={href} prefetch={false} {...props} />
    : <a href={href} {...props} />;
}

export default function SiteChrome() {
  const pathname = usePathname();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const [menu, setMenu] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [settings, setSettings] = useState<SettingMap>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [themeSettings, setThemeSettings] = useState<any>(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
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
      mounted = false;
      window.removeEventListener('wahaj-cart-change', sync);
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
    if (!cartDrawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cartCloseButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setCartDrawerOpen(false);
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
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      cartButtonRef.current?.focus();
    };
  }, [cartDrawerOpen]);

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

            <SiteLink
              href="/"
              className="wahaj-header__logo flex flex-col items-start"
              aria-label="وَهَج - الصفحة الرئيسية"
            >
              <span className="font-bold text-lg tracking-wider text-foreground">{settings.brand_name || 'وَهَج'}</span>
              <small className="text-[9px] tracking-widest text-[var(--gold)]">Wahaj Store</small>
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
                  className={`transition-colors hover:text-[var(--gold)] ${pathname === x.href ? 'text-[var(--gold)] font-bold border-b-2 border-[var(--gold)] pb-0.5' : 'text-foreground/80'}`}
                >
                  {x.label}
                </SiteLink>
              ))}
          </nav>

          {/* الأيقونات العلوية النظيفة والمرتبة */}
          <div className="wahaj-header__actions flex items-center gap-4">
            <SiteLink
              href="/shop"
              className="wahaj-header__action text-foreground/80 hover:text-[var(--gold)] transition-colors p-1"
              aria-label="البحث"
              title="البحث"
            >
              <Search size={20} />
            </SiteLink>

            <SiteLink
              href="/account"
              className="wahaj-header__action text-foreground/80 hover:text-[var(--gold)] transition-colors p-1"
              aria-label="حسابي"
              title="حسابي"
            >
              <User size={20} />
            </SiteLink>

            {darkModeEnabled && <button
              type="button"
              onClick={() => setTheme(themeIsDark ? 'light' : 'dark')}
              className="wahaj-header__action text-foreground/80 hover:text-[var(--gold)] transition-colors p-1"
              aria-label="تبديل الوضع"
              title={themeIsDark ? 'الوضع النهاري' : 'الوضع الليلي'}
            >
              {themeIsDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>}

            {cartDrawerEnabled ? (
              <button
                type="button"
                ref={cartButtonRef}
                onClick={() => setCartDrawerOpen(true)}
                className="wahaj-header__action wahaj-header__cart relative text-foreground/80 hover:text-[var(--gold)] transition-colors p-1"
                aria-label={`فتح السلة الجانبية (${cartCount})`}
                title="السلة"
              >
                <ShoppingBag size={20} />
                {cartCount > 0 && <span className="absolute -top-1.5 -end-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--gold)] text-[9px] font-bold text-[var(--gold-contrast)] shadow-sm">{cartCount}</span>}
              </button>
            ) : <SiteLink href="/cart" className="wahaj-header__action wahaj-header__cart relative text-foreground/80 hover:text-[var(--gold)] transition-colors p-1" aria-label="السلة" title="السلة">
              <ShoppingBag size={20} />
              {cartCount > 0 && <span className="absolute -top-1.5 -end-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--gold)] text-[9px] font-bold text-[var(--gold-contrast)] shadow-sm">{cartCount}</span>}
            </SiteLink>}
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
                <SiteLink href="/" className="wahaj-mobile-drawer__brand" onClick={() => setMenu(false)} aria-label="وَهَج — الصفحة الرئيسية">
                  <span className="wahaj-mobile-drawer__brand-mark"><ShoppingBag size={21} strokeWidth={1.7} /></span>
                  <span className="wahaj-mobile-drawer__brand-copy">
                    <b>{settings.brand_name || 'وَهَج'}</b>
                    <small>WAHAJ STORE</small>
                  </span>
                </SiteLink>
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
                <SiteLink href="/shop" onClick={() => setMenu(false)} className="wahaj-mobile-drawer__shop-link">
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
                        onClick={() => setMenu(false)}
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
                <SiteLink href="/contact" onClick={() => setMenu(false)} className="wahaj-mobile-drawer__support">
                  <MessageCircle size={16} /> المساعدة
                </SiteLink>
              </div>
              <p className="wahaj-mobile-drawer__copyright">جميع الحقوق محفوظة لمتجر {settings.brand_name || 'وَهَج'} © {new Date().getFullYear()}</p>
            </div>
          </aside>
        </div>
      )}

      {cartDrawerOpen && (
        <div className="wahaj-cart-drawer-overlay" role="presentation" onMouseDown={() => setCartDrawerOpen(false)}>
          <aside
            ref={cartPanelRef}
            className="wahaj-cart-drawer"
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
                onClick={() => setCartDrawerOpen(false)}
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
                  <SiteLink href="/shop" onClick={() => setCartDrawerOpen(false)} className="wahaj-cart-drawer__shop-link">اكتشفي المتجر <ArrowLeft size={15} /></SiteLink>
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
                <SiteLink href="/checkout" onClick={() => setCartDrawerOpen(false)} className="wahaj-cart-drawer__checkout">إتمام الطلب <ArrowLeft size={16} /></SiteLink>
                <SiteLink href="/cart" onClick={() => setCartDrawerOpen(false)} className="wahaj-cart-drawer__review">مراجعة السلة كاملة</SiteLink>
              </footer>
            )}
          </aside>
        </div>
      )}

      <nav className="wahaj-mobile-bottom-nav" aria-label="التنقل السريع">
        <SiteLink href="/" className={pathname === '/' ? 'is-active' : ''} aria-label="الرئيسية">
          <Home size={18} /><span>الرئيسية</span>
        </SiteLink>
        <SiteLink href="/shop" className={pathname?.startsWith('/shop') ? 'is-active' : ''} aria-label="المتجر">
          <Store size={18} /><span>المتجر</span>
        </SiteLink>
        <SiteLink href="/cart" className={pathname?.startsWith('/cart') ? 'is-active wahaj-mobile-bottom-nav__cart' : 'wahaj-mobile-bottom-nav__cart'} aria-label="السلة">
          <ShoppingBag size={18} /><span>السلة</span>
          {cartCount > 0 && <b>{cartCount > 99 ? '99+' : cartCount}</b>}
        </SiteLink>
        <SiteLink href="/account" className={pathname?.startsWith('/account') ? 'is-active' : ''} aria-label="حسابي">
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
      {!popupExcluded && <StorePopup enabled={settings.popup_enabled} config={settings.popup_config} visitKey={pathname || '/'} />}
    </>
  );
}
