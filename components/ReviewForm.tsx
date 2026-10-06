'use client';

import { FormEvent, useState } from 'react';
import { Send, Star } from 'lucide-react';

type ReviewStatus = 'idle' | 'loading' | 'success' | 'error';

export default function ReviewForm({ productId }: { productId: string }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<ReviewStatus>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim()) {
      setStatus('error');
      setMessage('اكتبي تجربتك قبل إرسال التقييم.');
      return;
    }

    setStatus('loading');
    setMessage('');
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, rating, text: text.trim() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'تعذر إرسال التقييم الآن.');

      setText('');
      setStatus('success');
      setMessage('شكرًا لمشاركة تجربتكِ. أُرسل تقييمك للمراجعة قبل نشره.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'حدث خطأ غير متوقع. حاولي مرة أخرى.');
    }
  }

  return (
    <form className="wahaj-review-form" onSubmit={submit}>
      <div className="wahaj-review-form__heading">
        <div>
          <b>أضيفي تقييمكِ</b>
          <small>رأيكِ يساعد عميلات وَهَج في اختيارهن.</small>
        </div>
        <Star size={17} aria-hidden="true" />
      </div>

      <div className="wahaj-review-form__rating" role="radiogroup" aria-label="تقييمك من خمس نجوم">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            type="button"
            key={value}
            role="radio"
            aria-checked={rating === value}
            aria-label={`${value} من 5 نجوم`}
            disabled={status === 'loading'}
            onClick={() => setRating(value)}
            className={value <= rating ? 'is-active' : ''}
          >★</button>
        ))}
        <span>{rating.toLocaleString('ar-EG')} من 5</span>
      </div>

      <label className="wahaj-review-form__label" htmlFor={`review-${productId}`}>تجربتكِ مع المنتج</label>
      <textarea
        id={`review-${productId}`}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="اكتبي ما أحببتِه في القطعة…"
        maxLength={1500}
        rows={4}
        required
        disabled={status === 'loading'}
      />
      <div className="wahaj-review-form__footer">
        <small>{text.length.toLocaleString('ar-EG')} / ١٥٠٠</small>
        <button type="submit" disabled={status === 'loading' || !text.trim()}>
          <span>{status === 'loading' ? 'جارٍ الإرسال…' : 'إرسال التقييم'}</span>
          <Send size={15} aria-hidden="true" />
        </button>
      </div>
      <p className={`wahaj-review-form__message is-${status}`} aria-live="polite" role={status === 'error' ? 'alert' : 'status'}>
        {message || 'تُراجع التقييمات قبل ظهورها على صفحة المنتج.'}
      </p>
    </form>
  );
}
