'use client';

import { useEffect, useRef, type AnchorHTMLAttributes } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, CircleHelp, CreditCard, Home, Info, MessageCircle, Moon, ShoppingBag, Store, Sun, Truck, User, X } from 'lucide-react';
import { useDialogFocus } from '@/hooks/use-dialog-focus';

type MenuLink = { label: string; href: string };
type SiteLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };

type MobileMenuDrawerProps = {
  closing: boolean;
  headerMenu: MenuLink[];
  utilityLinks: MenuLink[];
  cartCount: number;
  brandName: string;
  themeIsDark: boolean;
  setTheme: (theme: string) => void;
  closeMenu: () => void;
  pathname: string;
};

function SiteLink({ href, ...props }: SiteLinkProps) {
  return href.startsWith('/') && !href.startsWith('//')
    ? <Link href={href} prefetch={false} {...props} />
    : <a href={href} {...props} />;
}

function getMenuIcon(href: string) {
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
}

export default function MobileMenuDrawer({
  closing,
  headerMenu,
  utilityLinks,
  cartCount,
  brandName,
  themeIsDark,
  setTheme,
  closeMenu,
  pathname,
}: MobileMenuDrawerProps) {
  const menuCloseButtonRef = useRef<HTMLButtonElement>(null);
  const menuDialogRef = useDialogFocus<HTMLElement>({
    open: true,
    initialFocusRef: menuCloseButtonRef,
    onEscape: closeMenu,
  });

  useEffect(() => {
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
  }, []);

  const isRouteActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(`${href}/`));

  return (
    <div
      className={`wahaj-drawer-overlay${closing ? ' is-closing' : ''}`}
      onMouseDown={closeMenu}
      role="presentation"
    >
      <aside
        id="wahaj-mobile-drawer"
        ref={menuDialogRef}
        className={`wahaj-mobile-drawer${closing ? ' is-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="قائمة التنقل الرئيسية"
        tabIndex={-1}
        dir="rtl"
        onMouseDown={event => event.stopPropagation()}
      >
        <div className="wahaj-mobile-drawer__scroll">
          <div className="wahaj-mobile-drawer__top">
            <SiteLink href="/" className="wahaj-mobile-drawer__brand" onClick={closeMenu} aria-label="وَهَج — الصفحة الرئيسية">
              <span className="wahaj-mobile-drawer__brand-mark"><ShoppingBag size={21} strokeWidth={1.7} /></span>
              <span className="wahaj-mobile-drawer__brand-copy">
                <b>{brandName}</b>
                <small>WAHAJ STORE</small>
              </span>
            </SiteLink>
            <button
              type="button"
              ref={menuCloseButtonRef}
              onClick={closeMenu}
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
            <SiteLink href="/shop" onClick={closeMenu} className="wahaj-mobile-drawer__shop-link">
              اكتشفي المتجر <ArrowLeft size={14} />
            </SiteLink>
          </div>

          <nav className="wahaj-mobile-drawer__nav" aria-label="روابط المتجر">
            <p className="wahaj-mobile-drawer__section-label">تصفّحي المتجر</p>
            <div className="wahaj-mobile-drawer__links">
              {headerMenu.map((item, index) => {
                const active = isRouteActive(item.href);
                return (
                  <SiteLink
                    key={`${item.href}-${item.label}-${index}`}
                    href={item.href}
                    onClick={closeMenu}
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
                        onClick={closeMenu}
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
            <SiteLink href="/contact" onClick={closeMenu} className="wahaj-mobile-drawer__support">
              <MessageCircle size={16} /> المساعدة
            </SiteLink>
          </div>
          <p className="wahaj-mobile-drawer__copyright">جميع الحقوق محفوظة لمتجر {brandName} © {new Date().getFullYear()}</p>
        </div>
      </aside>
    </div>
  );
}
