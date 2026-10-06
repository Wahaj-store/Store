'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Banknote,
  Check,
  CreditCard,
  Headphones,
  Info,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FALLBACK_PAYMENT_METHODS, type StorePaymentMethod } from '@/lib/payment-methods';

type PaymentOption = StorePaymentMethod;
type LoadState = 'loading' | 'ready' | 'fallback';

function getMethodIcon(method: string): LucideIcon {
  switch (method.toUpperCase()) {
    case 'COD':
      return Banknote;
    case 'VODAFONE_CASH':
      return Smartphone;
    case 'INSTAPAY':
      return WalletCards;
    default:
      return CreditCard;
  }
}

function getMethodSummary(payment: PaymentOption): string {
  const description = payment.description?.trim();
  if (description && !description.includes('لوحة التحكم')) return description;
  if (payment.method === 'COD') return 'سدّدي قيمة الطلب إلى مندوب الشحن عند استلامه.';
  return 'تظهر بيانات الدفع والتعليمات الخاصة بهذه الوسيلة أثناء إتمام الطلب.';
}

function getPaymentSteps(payment: PaymentOption): string[] {
  if (payment.method === 'COD') {
    return [
      'أكملي بيانات الطلب وعنوان التوصيل.',
      `اختاري «${payment.label}» ضمن طرق الدفع المتاحة.`,
      'راجعي ملخص الطلب ورسوم التوصيل قبل التأكيد.',
      'سدّدي المبلغ الموضح إلى مندوب الشحن عند استلام الطلب.',
    ];
  }

  return [
    'أكملي بيانات الطلب وعنوان التوصيل.',
    `اختاري «${payment.label}» من طرق الدفع المتاحة.`,
    'راجعي بيانات التحويل والتعليمات التي تظهر في صفحة إتمام الطلب.',
    payment.proofRequired
      ? 'أكملي التحويل، ثم أرسلي إثبات الدفع ورقم العملية من صفحة إتمام الطلب.'
      : 'أكملي التحويل واحتفظي بإيصال العملية إلى أن يتم تأكيد الدفع.',
  ];
}

export default function PaymentPolicyClient() {
  const [methods, setMethods] = useState<PaymentOption[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/settings', { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('تعذّر جلب وسائل الدفع.');
        return response.json();
      })
      .then(data => {
        const rows = Array.isArray(data) ? data : data?.payments;
        if (!Array.isArray(rows)) throw new Error('استجابة وسائل الدفع غير صالحة.');

        const activeMethods = rows
          .filter((row): row is PaymentOption =>
            row &&
            typeof row.method === 'string' &&
            typeof row.label === 'string' &&
            row.label.trim().length > 0 &&
            row.enabled !== false,
          )
          .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

        if (activeMethods.length > 0) {
          setMethods(activeMethods);
          setState('ready');
        } else {
          setMethods(FALLBACK_PAYMENT_METHODS);
          setState('fallback');
        }
      })
      .catch(error => {
        if (error?.name === 'AbortError') return;
        setMethods(FALLBACK_PAYMENT_METHODS);
        setState('fallback');
      });

    return () => controller.abort();
  }, [retry]);

  return (
    <main className="wahaj-policy-page wahaj-payment-page" dir="rtl">
      <div className="wahaj-policy-shell">
        <header className="wahaj-policy-hero wahaj-payment-hero">
          <div className="wahaj-policy-hero__copy">
            <span className="wahaj-policy-kicker"><CreditCard size={15} /> وَهَج · خيارات دفع واضحة</span>
            <h1>سياسة الدفع</h1>
            <p>اختاري وسيلة الدفع المناسبة لكِ، واطّلعي على خطواتها قبل تأكيد الطلب. تتصل الصفحة ببيانات المتجر وتطابق خيارات الدفع المعروضة عند إتمام الطلب.</p>
            <Link href="/shop" className="wahaj-payment-hero__link">
              ابدئي التسوق <ArrowLeft size={15} aria-hidden="true" />
            </Link>
          </div>
          <span className="wahaj-policy-hero__icon"><WalletCards size={43} strokeWidth={1.35} /></span>
        </header>

        <section className="wahaj-payment-overview" aria-label="معلومات الدفع">
          <div className="wahaj-payment-overview__intro">
            <span className="wahaj-payment-overview__icon"><Info size={19} /></span>
            <div>
              <h2>قبل إتمام الدفع</h2>
              <p>تأكدي من إجمالي الطلب وبيانات التوصيل. تفاصيل الحساب أو التحويل تظهر بأمان عند اختيار وسيلة الدفع في صفحة إتمام الطلب.</p>
            </div>
          </div>
          <div className="wahaj-payment-overview__stat">
            <span className="wahaj-payment-overview__stat-icon"><CreditCard size={18} /></span>
            <div><b>{state === 'ready' || state === 'fallback' ? methods.length : '—'}</b><span>خيارات الدفع المعروضة</span></div>
          </div>
          <div className="wahaj-payment-overview__stat">
            <span className="wahaj-payment-overview__stat-icon"><LockKeyhole size={18} /></span>
            <div><b>بوضوح</b><span>التفاصيل قبل التأكيد</span></div>
          </div>
        </section>

        <section className="wahaj-payment-section" aria-labelledby="payment-methods-title">
          <div className="wahaj-policy-heading">
            <span>وسائل الدفع وخطواتها</span>
            <h2 id="payment-methods-title">اختاري الطريقة الأنسب لكِ</h2>
          </div>

          {state === 'loading' && (
            <div className="wahaj-payment-methods" aria-label="جارٍ تحميل وسائل الدفع" aria-busy="true">
              {[1, 2, 3].map(item => <div className="wahaj-payment-skeleton" key={item} />)}
            </div>
          )}

          {state === 'fallback' && (
            <div className="wahaj-payment-source-note" role="status">
              <Info size={17} />
              <p>تعذّر جلب إعدادات الدفع الحالية؛ نعرض خيارات الدفع الافتراضية نفسها الموجودة في صفحة إتمام الطلب.</p>
              <button type="button" onClick={() => { setState('loading'); setRetry(value => value + 1); }}>
                إعادة التحميل <RefreshCw size={13} />
              </button>
            </div>
          )}

          {(state === 'ready' || state === 'fallback') && methods.length > 0 && (
            <div className="wahaj-payment-methods" aria-live="polite">
              {methods.map((payment, index) => {
                const Icon = getMethodIcon(payment.method);
                return (
                  <article className="wahaj-payment-method" key={payment.method}>
                    <div className="wahaj-payment-method__top">
                      <span className="wahaj-payment-method__number">{String(index + 1).padStart(2, '0')}</span>
                      <span className="wahaj-payment-method__icon"><Icon size={22} strokeWidth={1.8} /></span>
                      {payment.proofRequired && <span className="wahaj-payment-method__badge">إثبات مطلوب</span>}
                    </div>
                    <h3>{payment.label}</h3>
                    <p className="wahaj-payment-method__description">{getMethodSummary(payment)}</p>
                    <div className="wahaj-payment-method__steps">
                      <h4>خطوات الدفع</h4>
                      <ol>
                        {getPaymentSteps(payment).map((step, stepIndex) => (
                          <li key={`${payment.method}-${stepIndex}`}>
                            <span><Check size={12} strokeWidth={2.5} /></span>
                            <p>{step}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                    <p className="wahaj-payment-method__note">
                      {payment.method === 'COD'
                        ? 'يُدفع المبلغ عند استلام الطلب.'
                        : 'لا تحوّلي قبل مراجعة بيانات المستفيد الظاهرة في صفحة إتمام الطلب.'}
                    </p>
                  </article>
                );
              })}
            </div>
          )}

        </section>

        <section className="wahaj-payment-security" aria-labelledby="payment-security-title">
          <div className="wahaj-payment-security__heading">
            <span><ShieldCheck size={22} /></span>
            <div>
              <span>حماية معلوماتك</span>
              <h2 id="payment-security-title">إرشادات لإتمام الدفع بأمان</h2>
            </div>
          </div>
          <ul>
            <li><Check size={15} /> تحققي من إجمالي الطلب وبيانات المستفيد قبل التحويل.</li>
            <li><Check size={15} /> لا تشاركي كلمة المرور أو رمز التحقق مع أي شخص.</li>
            <li><Check size={15} /> احتفظي بإيصال التحويل حتى يتم تأكيد الطلب.</li>
            <li><Check size={15} /> أرسلي إثبات الدفع من خلال صفحة إتمام الطلب عند طلبه.</li>
          </ul>
        </section>

        <section className="wahaj-payment-support">
          <span className="wahaj-payment-support__icon"><Headphones size={22} /></span>
          <div className="wahaj-payment-support__copy">
            <span>نحن إلى جانبك</span>
            <h2>هل تحتاجين إلى مساعدة؟</h2>
            <p>إذا واجهتك مشكلة في الدفع أو احتجتِ إلى توضيح، يسعد فريق وَهَج بمساعدتك.</p>
          </div>
          <div className="wahaj-payment-support__actions">
            <Link href="/contact">تواصلي معنا <ArrowLeft size={14} /></Link>
            <Link href="/faq">الأسئلة الشائعة</Link>
          </div>
        </section>

        <p className="wahaj-payment-footnote">قد تختلف وسائل الدفع المتاحة حسب إعدادات المتجر، وتظهر لك الخيارات المفعّلة قبل تأكيد طلبك.</p>
      </div>
    </main>
  );
}
