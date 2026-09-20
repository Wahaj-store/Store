'use client';
import { useState, useEffect } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export default function FAQPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetch('/api/faq')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setFaqs(data);
      })
      .catch(() => {});
  }, []);

  const filteredFaqs = activeTab === 'all' 
    ? faqs 
    : faqs.filter(f => f.category === activeTab);

  return (
    <main className="container max-w-4xl py-12">
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <h1 className="text-3xl font-bold">الأسئلة الشائعة</h1>
        <p className="muted text-sm">إجابات شاملة عن كل ما تود معرفته بخصوص الدفع، الشحن، الاستبدال والمنتجات.</p>
      </div>

      {/* تصنيفات الأسئلة */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {[
          { key: 'all', label: 'الكل' },
          { key: 'shipping', label: 'الشحن والتوصيل' },
          { key: 'payment', label: 'الدفع' },
          { key: 'returns', label: 'الاستبدال والاسترجاع' },
          { key: 'products', label: 'المنتجات' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition border ${activeTab === tab.key ? 'bg-[var(--gold)] text-white border-[var(--gold)]' : 'bg-background border hairline muted hover:text-foreground'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* قائمة الـ Accordion */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="lux-card p-8 text-center muted text-sm">لا توجد أسئلة مضافة في هذا القسم حالياً.</div>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div 
                key={faq.id || idx} 
                className="lux-card bg-background border hairline rounded-xl overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-start font-semibold text-sm gap-4"
                >
                  <span className="flex items-center gap-3">
                    <HelpCircle size={18} className="text-[var(--gold)] flex-shrink-0" />
                    {faq.question}
                  </span>
                  <ChevronDown size={18} className={`transition-transform duration-200 text-[var(--gold)] ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-sm muted border-t hairline leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
