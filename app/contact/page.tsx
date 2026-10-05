'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function ContactPage() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [messageLength, setMessageLength] = useState(0);

  useEffect(() => {
    let mounted = true;

    fetch('/api/settings')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (mounted && data) setSettings(data.settings || {});
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    const form = event.currentTarget;
    const formData = {
      name: (form.elements.namedItem('name') as HTMLInputElement)?.value.trim(),
      phone: (form.elements.namedItem('phone') as HTMLInputElement)?.value.trim(),
      subject: (form.elements.namedItem('subject') as HTMLInputElement)?.value.trim(),
      message: (form.elements.namedItem('message') as HTMLTextAreaElement)?.value.trim(),
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'حدث خطأ أثناء إرسال الرسالة، حاولي مرة أخرى.');
        return;
      }

      setSuccess(true);
      setMessageLength(0);
      form.reset();
    } catch {
      setError('تعذر الاتصال بالخادم. تحققي من اتصالك وحاولي مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  const whatsapp = settings.whatsapp ? String(settings.whatsapp).replace(/\D/g, '') : '';

  return (
    <main className="wahaj-contact-page" dir="rtl">
      <div className="wahaj-contact-shell">
        <header className="wahaj-contact-hero">
          <div className="wahaj-contact-hero__copy">
            <span className="wahaj-contact-kicker">
              <Sparkles size={15} aria-hidden="true" /> خدمة العملاء
            </span>
            <h1>يسعدنا أن نسمع منك</h1>
            <p>
              لديكِ استفسار عن منتج أو طلب؟ اتركي رسالتك وسيتواصل معك فريق وَهَج بأقرب وقت.
            </p>
            <div className="wahaj-contact-hero__trust">
              <ShieldCheck size={17} aria-hidden="true" />
              <span>نحافظ على خصوصية بياناتك ونستخدمها للرد على استفسارك فقط.</span>
            </div>
          </div>
          <div className="wahaj-contact-hero__mark" aria-hidden="true">
            <MessageCircle size={48} strokeWidth={1.2} />
          </div>
        </header>

        <div className="wahaj-contact-layout">
          <section className="wahaj-contact-info" aria-labelledby="contact-info-title">
            <div className="wahaj-contact-section-heading">
              <span>نحن هنا لمساعدتك</span>
              <h2 id="contact-info-title">طرق التواصل</h2>
            </div>

            <div className="wahaj-contact-info-list">
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wahaj-contact-info-card wahaj-contact-info-card--whatsapp"
                >
                  <span className="wahaj-contact-info-card__icon"><MessageCircle size={21} /></span>
                  <span className="wahaj-contact-info-card__body">
                    <small>تواصل مباشر عبر واتساب</small>
                    <strong dir="ltr">{settings.whatsapp}</strong>
                  </span>
                  <ArrowLeft size={17} aria-hidden="true" />
                </a>
              )}

              <div className="wahaj-contact-info-card">
                <span className="wahaj-contact-info-card__icon"><Clock3 size={21} /></span>
                <span className="wahaj-contact-info-card__body">
                  <small>ساعات العمل</small>
                  <strong>طوال أيام الأسبوع من 10 صباحًا حتى 10 مساءً</strong>
                </span>
              </div>

              <div className="wahaj-contact-info-card">
                <span className="wahaj-contact-info-card__icon"><MapPin size={21} /></span>
                <span className="wahaj-contact-info-card__body">
                  <small>نخدمك من</small>
                  <strong>جمهورية مصر العربية</strong>
                </span>
              </div>
            </div>

            <div className="wahaj-contact-info__note">
              <Mail size={17} aria-hidden="true" />
              <span>للاستفسارات العامة، أرسلي رسالتك من النموذج وسنعود إليك بالتفاصيل.</span>
            </div>
          </section>

          <section className="wahaj-contact-form-card" aria-labelledby="contact-form-title">
            <div className="wahaj-contact-section-heading">
              <span>رسالتك تصلنا مباشرة</span>
              <h2 id="contact-form-title">أرسلي رسالة</h2>
            </div>

            {success ? (
              <div className="wahaj-contact-success" role="status">
                <span className="wahaj-contact-success__icon"><CheckCircle2 size={31} /></span>
                <h3>تم إرسال رسالتك بنجاح</h3>
                <p>شكرًا لتواصلك معنا، سيقوم فريق وَهَج بالرد عليك في أقرب وقت ممكن.</p>
                <button type="button" onClick={() => setSuccess(false)}>
                  إرسال رسالة أخرى <ArrowLeft size={15} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="wahaj-contact-form">
                <div className="wahaj-contact-form__grid">
                  <label>
                    <span>الاسم بالكامل <b>*</b></span>
                    <input name="name" required autoComplete="name" placeholder="اكتبي اسمك" />
                  </label>
                  <label>
                    <span>رقم الهاتف <b>*</b></span>
                    <input name="phone" required autoComplete="tel" inputMode="tel" dir="ltr" placeholder="01xxxxxxxxx" />
                  </label>
                </div>

                <label>
                  <span>موضوع الرسالة <em>اختياري</em></span>
                  <input name="subject" placeholder="استفسار عن طلب، منتج، أو خدمة..." />
                </label>

                <label>
                  <span>النص أو الاستفسار <b>*</b></span>
                  <textarea
                    name="message"
                    required
                    minLength={5}
                    maxLength={1200}
                    rows={6}
                    placeholder="اكتبي تفاصيل رسالتك هنا..."
                    onChange={event => setMessageLength(event.target.value.length)}
                  />
                  <small className="wahaj-contact-form__counter">{messageLength}/1200</small>
                </label>

                {error && <p className="wahaj-contact-form__error" role="alert">{error}</p>}

                <button type="submit" disabled={loading} className="wahaj-contact-submit">
                  <Send size={17} aria-hidden="true" />
                  {loading ? 'جارٍ إرسال الرسالة...' : 'إرسال الرسالة'}
                </button>
                <p className="wahaj-contact-form__hint">بالضغط على الإرسال، ستصل رسالتك إلى فريق خدمة العملاء.</p>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
