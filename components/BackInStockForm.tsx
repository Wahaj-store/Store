'use client';

import { FormEvent, useState } from 'react';
import { BellRing } from 'lucide-react';

export default function BackInStockForm({ productId }: { productId: string }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [hasError, setHasError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setHasError(false);
    try {
      const response = await fetch(`/api/products/${productId}/back-in-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذر تفعيل التنبيه الآن.');
      setMessage(result.message || 'تم تسجيل طلب التنبيه بنجاح.');
      setEmail('');
      setPhone('');
    } catch (error) {
      setHasError(true);
      setMessage(error instanceof Error ? error.message : 'حدث خطأ غير متوقع. حاولي مرة أخرى.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="wahaj-stock-alert" onSubmit={submit}>
      <div className="wahaj-stock-alert__heading">
        <span><BellRing size={18} /></span>
        <div><b>أبلغيني عند التوفر</b><small>سنخبركِ عند عودة القطعة إلى المتجر.</small></div>
      </div>
      <div className="wahaj-stock-alert__fields">
        <label>
          <span>البريد الإلكتروني</span>
          <input type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          <span>رقم الهاتف</span>
          <input type="tel" autoComplete="tel" inputMode="tel" placeholder="01xxxxxxxxx" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </label>
      </div>
      <button type="submit" disabled={busy || (!email.trim() && !phone.trim())}>
        {busy ? 'جارٍ تفعيل التنبيه…' : 'تفعيل التنبيه'}
      </button>
      <p className={hasError ? 'is-error' : ''} aria-live="polite" role={hasError ? 'alert' : 'status'}>{message}</p>
    </form>
  );
}
