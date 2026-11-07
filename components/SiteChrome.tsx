'use client';

import { useEffect, useRef, useState } from 'react';
import type { AnchorHTMLAttributes } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Menu, Search, User, Moon, Sun, ShoppingBag, MessageCircle, Home, Store } from 'lucide-react';
import { isPopupEnabled } from '@/lib/popup-config';
import { getPublicSettings } from '@/lib/public-settings-client';
import { useFeatureFlags } from '@/lib/use-feature-flags';

const CartDrawer = dynamic(() => import('@/components/CartDrawer'), { ssr: false });
const SearchDrawer = dynamic(() => import('@/components/SearchDrawer'), { ssr: false });
const StorePopup = dynamic(() => import('@/components/store/StorePopup'), { ssr: false });
const MobileMenuDrawer = dynamic(() => import('@/components/MobileMenuDrawer'), { ssr: false });

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
  const [themeReady, setThemeReady] = useState(false);

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
  const cartButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const settingsLoadedRef = useRef(false);
  const settingsRequestRef = useRef(false);
  const themeIsDark = themeReady && (resolvedTheme || theme) === 'dark';

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

  useEffect(() => {
    setThemeReady(true);
    return () => {
      if (menuCloseTimerRef.current) clearTimeout(menuCloseTimerRef.current);
      if (cartCloseTimerRef.current) clearTimeout(cartCloseTimerRef.current);
      if (searchCloseTimerRef.current) clearTimeout(searchCloseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (pathname?.startsWith('/admin')) {
      settingsLoadedRef.current = false;
      return;
    }

    if (!settingsLoadedRef.current && !settingsRequestRef.current) {
      settingsRequestRef.current = true;
      getPublicSettings()
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
    if (!cartDrawerOpen) return;
    const unlockBodyScroll = lockBodyScroll();
    return unlockBodyScroll;
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
  const drawerQuantity = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const drawerSubtotal = cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
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
          <div className="wahaj-header__brand flex items-center gap-3">
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
                aria-haspopup="dialog"
                aria-expanded={cartDrawerOpen}
                aria-controls="wahaj-cart-drawer"
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

      {menu && (
        <MobileMenuDrawer
          closing={menuClosing}
          headerMenu={headerMenu}
          utilityLinks={utilityLinks}
          cartCount={cartCount}
          brandName={settings.brand_name || 'وَهَج'}
          themeIsDark={themeIsDark}
          setTheme={setTheme}
          closeMenu={closeMenu}
          pathname={pathname || '/'}
        />
      )}

      {cartDrawerOpen && (
        <CartDrawer
          closing={cartDrawerClosing}
          cartItems={cartItems}
          drawerQuantity={drawerQuantity}
          drawerFreeShipping={drawerFreeShipping}
          drawerRemaining={drawerRemaining}
          drawerShippingProgress={drawerShippingProgress}
          drawerMoney={drawerMoney}
          close={closeCartDrawer}
          saveCart={saveDrawerCart}
          updateQuantity={updateDrawerQuantity}
        />
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
      {(searchDrawerOpen || searchDrawerClosing) && (
        <SearchDrawer open={searchDrawerOpen} onClose={closeSearchDrawer} closing={searchDrawerClosing} />
      )}
      {!popupExcluded && isPopupEnabled(settings.popup_enabled) && (
        <StorePopup enabled={settings.popup_enabled} config={settings.popup_config} visitKey={pathname || '/'} />
      )}
    </>
  );
}
