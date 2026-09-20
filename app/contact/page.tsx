'use client';
import { useState, useEffect } from 'react';
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => setSettings(data.settings || {}))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const form = e.currentTarget;
    const formData = {
      name: (form.elements.namedItem('name') as HTMLInputElement)?.value,
      phone: (form.elements.namedItem('phone') as HTMLInputElement)?.value,
      subject: (form.elements.namedItem('subject') as HTMLInputElement)?.value,
      message: (form.elements.namedItem('message') as HTMLTextAreaElement)?.value,
    };

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSuccess(true);
        form.reset();
      } else {
        const j = await res.json();
        setError(j.error || 'حدث خطأ أثناء إرسال الرسالة، حاول مرة أخرى.');
      }
    } catch {
      setError('تعذر الاتصال بالخادم.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container max-w-5xl py-12">
      <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
        <h1 className="text-3xl font-bold">تواصل معنا</h1>
        <p className="muted text-sm">نحن هنا للإجابة على استفساراتك ومساعدتك في أي وقت. لا تتردد في مراسلتنا.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* معلومات التواصل */}
        <div className="lux-card p-8 bg-background border hairline rounded-2xl space-y-6 h-fit">
          <h2 className="text-xl font-semibold border-b hairline pb-4">معلومات الاتصال</h2>
          
          <div className="space-y-5 text-sm">
            {settings.whatsapp && (
              <a 
                href={`https://wa.me/${settings.whatsapp}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-3 rounded-xl border hairline hover:border-[var(--gold)] transition"
              >
                <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center font-bold">WA</div>
                <div>
                  <span className="block muted text-xs">تواصل مباشر عبر واتساب</span>
                  <span className="font-semibold" dir="ltr">{settings.whatsapp}</span>
                </div>
              </a>
            )}

            <div className="flex items-center gap-4 p-3 rounded-xl border hairline">
              <div className="w-10 h-10 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <span className="block muted text-xs">ساعات العمل</span>
                <span className="font-semibold">طوال أيام الأسبوع من 10 صباحاً حتى 10 مسائاً</span>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-xl border hairline">
              <div className="w-10 h-10 rounded-lg bg-[var(--gold)]/10 text-[var(--gold)] flex items-center justify-center">
                <MapPin size={20} />
              </div>
              <div>
                <span className="block muted text-xs">العنوان</span>
                <span className="font-semibold">جمهورية مصر العربية</span>
              </div>
            </div>
          </div>
        </div>

        {/* نموذج التواصل */}
        <div className="lux-card p-8 bg-background border hairline rounded-2xl space-y-6">
          هندسة نموذج التواصل...
          <h2 className="text-xl font-semibold border-b hairline pb-4">أرسل رسالة</h2>

          {success ? (
            <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/30 text-center space-y-3">
              <CheckCircle2 size={40} className="text-green-600 mx-auto" />
              <h3 className="font-bold text-green-700">تم إرسال رسالتك بنجاح!</h3>
              <p className="text-xs muted">سنقوم بالرد عليك في أقرب وقت ممكن.</p>
              <button 
                onClick={() => setSuccess(false)} 
                className="mt-2 text-xs text-[var(--gold)] font-medium underline"
              >
                إرسال رسالة أخرى
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block text-sm font-medium">الاسم بالكامل
                <input name="name" required className="input mt-1 w-full" placeholder="أدخل اسمك" />
              </label>

              <label className="block text-sm font-medium">رقم الهاتف
                <input name="phone" required className="input mt-1 w-full" placeholder="01xxxxxxxxx" />
              </label>

              <label className="block text-sm font-medium">موضوع الرسالة
                <input name="subject" className="input mt-1 w-full" placeholder="استفسار عن طلب، منتج..." />
              </label>

              <label className="block text-sm font-medium">النص أو الاستفسار
                <textarea name="message" required className="input mt-1 min-h-32 w-full" placeholder="اكتب تفاصيل رسالتك هنا..." />
              </label>

              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

              <button 
                disabled={loading} 
                className="btn btn-gold w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Send size={16} /> {loading ? 'جارٍ الإرسال...' : 'إرسال الرسالة'}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
