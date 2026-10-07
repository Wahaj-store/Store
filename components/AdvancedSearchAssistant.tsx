'use client';

import { FormEvent, useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function AdvancedSearchAssistant() {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 2 || busy) return;
    setBusy(true);
    setMessage('جارٍ فهم طلبك…');
    try {
      const response = await fetch('/api/search/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await response.json();
      if (!response.ok || !data?.filters) throw new Error(data?.error || 'تعذر تحليل البحث');
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(data.filters as Record<string, unknown>)) {
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
      }
      window.location.assign(`/shop${params.toString() ? `?${params.toString()}` : ''}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر تحليل البحث');
      setBusy(false);
    }
  }

  return (
    <div className="wahaj-ai-search" aria-label="مساعد البحث الذكي">
      <div className="wahaj-ai-search__intro">
        <span className="wahaj-ai-search__icon"><Sparkles size={15} /></span>
        <div><b>ابحثي بطريقتك</b><small>صفي ما تريدين بجملة طبيعية</small></div>
      </div>
      <form onSubmit={submit} className="wahaj-ai-search__form">
        <input
          value={query}
          onChange={(event) => { setQuery(event.target.value); setMessage(''); }}
          placeholder="مثال: هدية ذهبية أقل من 1000 ومتاحة"
          maxLength={160}
          aria-label="وصف البحث الذكي"
        />
        <button type="submit" disabled={busy || query.trim().length < 2} aria-label="تحليل البحث">
          {busy ? '…' : 'حلّلي'} <ArrowLeft size={14} />
        </button>
      </form>
      {message ? <p className="wahaj-ai-search__message" aria-live="polite">{message}</p> : null}
    </div>
  );
}
