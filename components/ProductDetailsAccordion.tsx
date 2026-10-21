'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, Droplets, FileText, Gem, Truck } from 'lucide-react';

type Props = {
  productName: string;
  description?: string | null;
  material?: string | null;
  careInstructions?: string | null;
};

export default function ProductDetailsAccordion({
  productName,
  description,
  material,
  careInstructions,
}: Props) {
  const [openId, setOpenId] = useState<string | null>('description');

  const items = [
    {
      id: 'description',
      title: 'الوصف والتفاصيل',
      Icon: FileText,
      content: <p>{description || `قطعة ${productName} مختارة بعناية لتضيف لمسة أنيقة إلى إطلالتك.`}</p>,
    },
    {
      id: 'material',
      title: 'الخامة',
      Icon: Gem,
      content: <p>{material || 'مختارة بعناية فائقة.'}</p>,
    },
    {
      id: 'care',
      title: 'العناية بالقطعة',
      Icon: Droplets,
      content: <p>{careInstructions || 'يُحفظ بعيدًا عن الرطوبة والعطور المباشرة، ويمسح بقطعة قماش ناعمة بعد الاستخدام.'}</p>,
    },
    {
      id: 'shipping',
      title: 'الشحن والاستبدال',
      Icon: Truck,
      content: (
        <>
          <p>تعرّفي على تفاصيل التوصيل والاستبدال قبل إتمام طلبك.</p>
          <Link href="/policies/shipping">عرض سياسة الشحن والاستبدال <ArrowLeft size={14} aria-hidden="true" /></Link>
        </>
      ),
    },
  ];

  return (
    <div className="wahaj-product-accordions wahaj-help-list" aria-label="تفاصيل المنتج">
      {items.map(({ id, title, Icon, content }) => {
        const isOpen = openId === id;
        return (
          <article className={`wahaj-faq-item ${isOpen ? 'is-open' : ''}`} key={id}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : id)}
              aria-expanded={isOpen}
              className="wahaj-faq-question"
            >
              <span><i><Icon size={17} aria-hidden="true" /></i>{title}</span>
              <ChevronDown size={18} aria-hidden="true" />
            </button>
            {isOpen ? <div className="wahaj-faq-answer">{content}</div> : null}
          </article>
        );
      })}
    </div>
  );
}
