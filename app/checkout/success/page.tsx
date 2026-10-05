'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, CheckCircle2, Copy, Home, PackageCheck, ShieldCheck, ShoppingBag, Sparkles, Truck } from 'lucide-react';

export default function Success({ searchParams }: { searchParams: { order?: string } }) {
  const orderNumber = searchParams?.order || 'WAH-XXXXX';
  const [copied, setCopied] = useState(false);

  const copyOrderNumber = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="wahaj-success-page" dir="rtl">
      <div className="wahaj-commerce-shell wahaj-success-shell">
        <header className="wahaj-commerce-header wahaj-success-header">
          <div>
            <span className="wahaj-commerce-kicker"><Sparkles size={14} /> وَهَج للأناقة</span>
            <h1>تم تأكيد طلبكِ</h1>
            <p>شكرًا لثقتكِ. بدأنا تجهيز اختياراتكِ بعناية لتصل إليكِ كما تحبين.</p>
          </div>
          <Link href="/" className="wahaj-commerce-ghost"><Home size={16} /> العودة للرئيسية</Link>
        </header>

        <nav className="wahaj-order-steps wahaj-success-steps" aria-label="مراحل الطلب">
          <div className="is-complete"><b><Check size={13} /></b><span>السلة</span></div><i className="is-complete" />
          <div className="is-complete"><b><Check size={13} /></b><span>الشحن والدفع</span></div><i className="is-complete" />
          <div className="is-active"><b>03</b><span>التأكيد</span></div>
        </nav>

        <section className="wahaj-success-layout">
          <div className="wahaj-success-main">
            <div className="wahaj-success-hero">
              <div className="wahaj-success-orbit wahaj-success-orbit--one" />
              <div className="wahaj-success-orbit wahaj-success-orbit--two" />
              <div className="wahaj-success-check"><CheckCircle2 size={48} strokeWidth={1.5} /></div>
              <span className="wahaj-success-eyebrow">تم الاستلام بنجاح</span>
              <h2>طلبكِ في أيدٍ أمينة</h2>
              <p>سيقوم فريقنا بمراجعة الطلب وتجهيزه، وسنوافيكِ بأي تحديثات مهمة على حالة الشحنة.</p>
              <div className="wahaj-success-order-box">
                <span>رقم الطلب</span>
                <strong dir="ltr">{orderNumber}</strong>
                <button type="button" onClick={copyOrderNumber} aria-label="نسخ رقم الطلب">{copied ? <Check size={16} /> : <Copy size={16} />}<small>{copied ? 'تم النسخ' : 'نسخ'}</small></button>
              </div>
            </div>

            <div className="wahaj-success-next">
              <div className="wahaj-success-next__icon"><PackageCheck size={22} /></div>
              <div><span>ماذا يحدث الآن؟</span><h3>نجهّز طلبكِ بكل اهتمام</h3><p>سيتم التواصل معكِ عند انتقال الطلب إلى مرحلة الشحن. احتفظي برقم الطلب للرجوع إليه بسهولة.</p></div>
            </div>
          </div>

          <aside className="wahaj-success-aside">
            <div className="wahaj-cart-summary__label">رحلة طلبكِ</div>
            <h2>الخطوة التالية</h2>
            <div className="wahaj-success-timeline">
              <div className="is-done"><span><Check size={12} /></span><div><b>تم استلام الطلب</b><small>تم تسجيل بيانات طلبكِ بنجاح</small></div></div>
              <div className="is-current"><span><PackageCheck size={13} /></span><div><b>جاري التجهيز</b><small>نراجع القطع ونجهزها للتغليف</small></div></div>
              <div><span><Truck size={13} /></span><div><b>الشحن والتوصيل</b><small>سنرسل لكِ تحديث التتبع عند الشحن</small></div></div>
            </div>
            <div className="wahaj-success-actions">
              <Link href="/track-order" className="wahaj-commerce-primary">تتبع حالة الطلب <ArrowLeft size={17} /></Link>
              <Link href="/shop" className="wahaj-commerce-ghost"><ShoppingBag size={16} /> مواصلة التسوق</Link>
            </div>
            <p className="wahaj-summary-note"><ShieldCheck size={14} /> بيانات طلبكِ محفوظة ومحمية</p>
          </aside>
        </section>
      </div>
    </main>
  );
}
